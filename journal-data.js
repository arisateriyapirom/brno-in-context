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

];
