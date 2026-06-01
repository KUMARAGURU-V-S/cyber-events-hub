const cheerio = require('cheerio');
fetch('https://mlh.io/seasons/2026/events').then(r => r.text()).then(html => {
  const $ = cheerio.load(html);
  const events = [];
  $('.event-wrapper').each((i, el) => {
    events.push({
      title: $(el).find('.event-name').text().trim(),
      url: $(el).find('.event-link').attr('href'),
      startDate: $(el).find('meta[itemprop="startDate"]').attr('content'),
      endDate: $(el).find('meta[itemprop="endDate"]').attr('content')
    });
  });
  console.log(events.slice(0, 3));
}).catch(console.error);
