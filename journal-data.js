// Draft content: replace prompts with personal observations, set image to a local
// photo path (e.g. "images/journal/morning.jpg"), add alt text and a date.
// Set draft:false when an entry is ready. Categories may contain multiple tags.
// Set location: {lat: ..., lng: ...} for the actual photo position. A null location
// shows a clearly labeled cadastral-area reference pin instead, not a photo pin.
// Optional visit notes: fill the quoted strings; leave unknown details blank.
// comfort: seating, shade and shelter. suitedTo: your personal impression.
// These dated observations do not change map scores.
const journalEntries = [
    { id: 'danuse-muzikarova-park', title: 'Dynamic Spektrum', subtitle: 'Prototyp Crew · Prototyp Festival 2026', area: 'Město Brno', categories: ['Life Here', 'Arts'], tone: 'sage',
      video: 'data/images_life/01-1.mp4', image: 'data/images_life/01-1-poster.jpg', alt: 'Video from Danuše Muzikářová Park', date: '',
      location: {lat: 49.197990, lng: 16.609452}, locationKind: 'place', draft: false,
      observations: {
        visitDate: "29 September 2026", // Date of your visit, e.g. 30 October 2026
        visitTime: "Early afternoon", // Approximate time, e.g. late afternoon
        cost: "Free entry, public art installation", // Free entry, paid, or purchase expected
        comfort: "Light, airy, and vibrant environment. You can sit under the installation and observe the interplay of light and shadow from below.", // Seating, shade and shelter you noticed
        walking: "Easily accessible from Česka tram stop. Installation is by the main pedestrian path.", // Approach, crossings, steps or entrances
        suitedTo: "Art enthusiasts, those who appreciate temporary public installations, or people who are simply interested in unique experiences and want to explore the art scene in Brno.", // Who might enjoy it, in your opinion
      },
      caption: `A temporary textile installation in Danuše Muzikářová Park, *Dynamic Spektrum* explores colour through layers of suspended fabric that shift with light, movement and perspective.

What caught my attention most was simply how colourful it was. At a time when minimalism continues to shape so much of contemporary design (muted tones, beige, black and white often associated with being more elegant or timeless) it felt refreshing to encounter something so vibrant in the middle of the city.

As the fabric moved, each colour caught the light differently, constantly changing the appearance of the installation. Against the trees and autumn light, the installation felt especially fitting: bright and playful, but completely at blending in with the colours of the season.` },
    { id: 'noji-ceramic', title: 'Noji Ceramic', area: 'Ponava', categories: ['Life Here'], tone: 'sand',
      image: 'data/images_life/02-01.jpg',
      images: ['data/images_life/02-01.jpg', 'data/images_life/02-02.jpeg', 'data/images_life/02-03.jpeg', 'data/images_life/02-04.jpeg', 'data/images_life/02-05.jpeg'],
      alt: 'My ceramics experience at Noji Ceramic', date: '', draft: false,
      location: {lat: 49.2127594, lng: 16.600893}, locationKind: 'venue',
      locationUrl: 'https://maps.app.goo.gl/zL6Rb6H4tWMpSPPQ9',
      observations: {
        visitDate: "14 October 2026", // Date of your visit
        visitTime: "Late morning", // Approximate time
        cost: "Workshop fee: 250 CZK / hour (for hand modeled ceramics)", // Free entry, paid, or purchase expected
        comfort: "Cozy and welcoming studio", // Seating, shade and shelter you noticed
        walking: "", // Approach, crossings, steps or entrances
        suitedTo: "People who are interested in ceramics or want to try a new creative activity.", // Who might enjoy it, in your opinion
      },
      caption: `Trying ceramics for the first time became one of those small experiences that made my life in Brno feel more fun. There’s something very calming about working with clay, creating without worrying about whether something is right or wrong, and simply making what feels good to you.

Noji Ceramic also has a warm, cozy atmosphere. Jitka is incredibly friendly and helpful, and makes the studio feel comfortable and easygoing from the moment I arrived.

Fingers crossed that my ceramics turn out great 🤞` },
    { id: '4pokoj', title: '4pokoj', area: 'Město Brno', categories: ['Life Here'], tone: 'sand',
      image: 'data/images_life/03.jpeg',
      alt: 'A visit to 4pokoj in Brno', date: '', draft: false,
      location: {lat: 49.1957508, lng: 16.6118235}, locationKind: 'venue',
      locationUrl: 'https://maps.app.goo.gl/XvZqxtL8XF9KJZKW8',
      observations: {
        visitDate: "13 November 2026", // Date of your visit
        visitTime: "Night", // Approximate time
        cost: "around 200 CZK per drink", // Free entry, paid, or purchase expected
        comfort: "Intimate and cozy (you most likely will have someone sitting / standing right next to you)", // Seating, shade and shelter you noticed
        walking: "", // Approach, crossings, steps or entrances
        suitedTo: "People looking for a relaxed (yet fun) atmosphere in the city.", // Who might enjoy it, in your opinion
      },
      caption: `Brno after dark is a different city. The streets are more vibrant and the people are more relaxed. With the city full of students, locals, and foreigners, there's a lot of energy in the air, and always something to explore after hours.
      
      4pokoj (4rooms)is a bar in the city center that draws people in with its interior and tasty drinks. The dark ambience clashes with the lively sound of laughter and conversation, creating a unique atmosphere that makes it a great place to unwind after a long day.
      I barely took any photos, which probably says it all 🌙`,
    },

    { id: 'bar-escobar', title: 'Bar Escobar', area: 'Žabovřesky', categories: ['Life Here'], tone: 'sage',
      image: 'data/images_life/04-01.jpeg',
      images: ['data/images_life/04-01.jpeg', 'data/images_life/04-02.JPG'],
      alt: 'Restaurant / Bar: Bar Escobar', date: '', draft: false,
      location: {lat: 49.2121506, lng: 16.5804313}, locationKind: 'place',
      locationUrl: 'https://maps.app.goo.gl/NhUzqvKnKRDsC2m1A',
      observations: {
        visitDate: "3 October 2026", // Date of your visit
        visitTime: "Evening", // Approximate time
        cost: "", // Free entry, paid, or purchase expected
        comfort: "Cozy and welcoming", // Seating, shade and shelter you noticed
        walking: "", // Approach, crossings, steps or entrances
        suitedTo: "People who enjoy a relaxed atmosphere, amazing food (meat lovers) and good drinks", // Who might enjoy it, in your opinion
      },
      caption: `Bar Escobar is a pub-style restaurant with a relaxed, easygoing feel. We came here after a full day of hiking, and the burgers were exactly what we needed. By the end of the meal, we felt completely revived.

The drinks menu has a good variety, and the staff were friendly throughout. The ambience stays fun and light, which makes it easy to settle in, unwind and enjoy a good meal after a long day outdoors 🍔`,
    },
    { id: 'veveri-walk', title: 'A Stroll Along Veveří', area: 'Veveří', categories: ['Streets'], tone: 'sage',
      video: 'data/images_life/05.mp4', image: 'data/images_life/05-poster.jpg',
      alt: 'A Stroll Along Veveří', date: '', draft: false,
      location: {lat: 49.2071046, lng: 16.5937143}, locationKind: 'place',
      locationUrl: 'https://maps.app.goo.gl/LZeKCWT96D88Uoye6',
      observations: {
        visitDate: "14 November 2026", // Date of your visit
        visitTime: "Late morning", // Approximate time
        cost: "", // Free entry, paid, or purchase expected
        comfort: "Stop by Björnsonův sad for a break in the park", // Seating, shade and shelter you noticed
        walking: "The path is flat, well maintained, and offers a pleasant walk towards the city center", // Approach, crossings, steps or entrances
        suitedTo: "", // Who might enjoy it, in your opinion
      },
      caption: `On a late Saturday morning, we took a stroll along the Veveri on our way to lunch. It was a quiet start to the day, with people slowly getting up and easing into their weekend.

The weather was perfect for fall: the sun was out, but the air still had that crisp, fresh feeling. Fallen leaves lay against the green grass along the path, a contrast that made the walk feel even more seasonal.

A simple, easy way to start the weekend 🍂`,
    },
];
