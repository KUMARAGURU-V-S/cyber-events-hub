import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache the response for 1 hour to prevent IP blocking

export interface CyberEvent {
  id: string;
  title: string;
  description: string;
  url: string;
  startDate: string;
  endDate: string;
  type: 'CTF' | 'Hackathon' | 'Conference';
  tags: string[];
  source: string;
}

const getTags = (title: string, desc: string): string[] => {
  const text = `${title} ${desc}`.toLowerCase();
  const tags = new Set<string>();

  if (/\b(web|sql|xss)\b/i.test(text)) tags.add('Web Security');
  if (/\b(pwn|binary|exploit)\b/i.test(text)) tags.add('Binary Exploitation');
  if (/\b(crypto|rsa|cipher)\b/i.test(text)) tags.add('Cryptography');
  if (/\b(forensic|osint|steg)\b/i.test(text)) tags.add('Forensics / OSINT');
  if (/\b(rev|reverse)\b/i.test(text)) tags.add('Reverse Engineering');
  if (/\b(ai|llm|machine learning)\b/i.test(text)) tags.add('AI Security');
  if (/\b(beginner|101|easy)\b/i.test(text)) tags.add('Beginner Friendly');
  
  return Array.from(tags);
};

import { execSync } from 'child_process';

export async function GET() {
  const events: CyberEvent[] = [];
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    // 1. Fetch CTFtime Events via curl to bypass Node.js IPv6/Cloudflare ETIMEDOUT issues
    const now = new Date();
    const future = new Date();
    future.setMonth(future.getMonth() + 3);
    
    const startTs = Math.floor(now.getTime() / 1000);
    const finishTs = Math.floor(future.getTime() / 1000);
    
    // Execute curl synchronously
    const curlCommand = `curl -s "https://ctftime.org/api/v1/events/?limit=20&start=${startTs}&finish=${finishTs}" -H "User-Agent: Mozilla/5.0"`;
    const curlOutput = execSync(curlCommand, { encoding: 'utf-8', timeout: 15000 });
    
    const ctfData = JSON.parse(curlOutput);
    
    if (Array.isArray(ctfData)) {
      ctfData.forEach((ctf: any) => {
        events.push({
          id: `ctf-${ctf.id}`,
          title: ctf.title,
          description: ctf.description || '',
          url: ctf.url || ctf.ctftime_url,
          startDate: ctf.start,
          endDate: ctf.finish,
          type: 'CTF',
          tags: getTags(ctf.title, ctf.description || ''),
          source: 'CTFtime'
        });
      });
    }
  } catch (error) {
    console.error("CTF curl fetch error:", error);
  }

  try {
    // 2. Fetch Unstop Hackathons (cybersecurity related)
    const unstopRes = await fetch('https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&searchTerm=cybersecurity', { headers });
    
    if (unstopRes.ok) {
      const unstopData = await unstopRes.json();
      if (unstopData?.data?.data) {
        unstopData.data.data.forEach((hackathon: any) => {
          events.push({
            id: `unstop-${hackathon.id}`,
            title: hackathon.title,
            description: hackathon.details || hackathon.seo_url || '',
            url: (hackathon.seo_url || hackathon.public_url)?.startsWith('http') ? (hackathon.seo_url || hackathon.public_url) : `https://unstop.com/${hackathon.seo_url || hackathon.public_url || ''}`,
            startDate: hackathon.start_date || hackathon.regnRequirements?.start_regn_dt || new Date().toISOString(),
            endDate: hackathon.end_date || hackathon.regnRequirements?.end_regn_dt || new Date().toISOString(),
            type: 'Hackathon',
            tags: getTags(hackathon.title, hackathon.details || ''),
            source: 'Unstop'
          });
        });
      }
    }
  } catch (error) {
    console.error("Unstop fetch error:", error);
  }

  try {
    // 3. Fetch Devpost Hackathons (custom scraper via API)
    const devpostRes = await fetch('https://devpost.com/api/hackathons?q=cybersecurity', { headers, signal: AbortSignal.timeout(8000) });
    if (devpostRes.ok) {
      const devpostData = await devpostRes.json();
      if (devpostData?.hackathons) {
        devpostData.hackathons.forEach((hackathon: any) => {
          const themes = hackathon.themes?.map((t: any) => t.name).join(', ') || '';
          const title = hackathon.title || '';
          
          // Strict filtering: ensure it's actually related to cybersecurity
          const searchStr = ` ${title} ${themes} `.toLowerCase();
          const isCyber = /(cyber|security|infosec|forensic|osint|[^a-z]ctf[^a-z]|[^a-z]pwn[^a-z]|crypto|reverse)/i.test(searchStr);
          if (!isCyber) return;

          events.push({
            id: `devpost-${hackathon.id}`,
            title: title,
            description: themes || 'Cybersecurity Hackathon',
            url: hackathon.url,
            startDate: hackathon.submission_period_dates?.split('-')[0]?.trim() + ' 2026' || new Date().toISOString(),
            endDate: hackathon.submission_period_dates?.split('-')[1]?.trim() || new Date().toISOString(),
            type: 'Hackathon',
            tags: getTags(title, themes),
            source: 'Devpost'
          });
        });
      }
    }
  } catch (error) {
    console.error("Devpost fetch error:", error);
  }

  // Sort by start date
  events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return NextResponse.json(events);
}
