# Epstein Flight Network Visualization

Interactive visualization of Jeffrey Epstein's flight records and co-travel network.


## Quick Start

```bash
# Start server
python3 -m http.server 8000

# Open in browser
http://localhost:8000
```

## Project Structure

```
Epstein-Flight-Explorer/
├── index.html                                   # Main visualization
├── js/                                          # JavaScript modules
│   ├── main.js
│   ├── map.js
│   ├── chord.js
│   ├── data.js
│   ├── ui.js
│   ├── tutorial.js
│   ├── utils.js
│   └── onboarding.js
├── css/                                         # Stylesheets
│   ├── style.css
│   └── onboarding.css
├── data/                                        # Data files
│   ├── flights.csv                              # Flight records
│   ├── persons.csv                              # Person data
│   ├── persons_enriched.csv                     # Enriched person data
│   ├── cities.json                              # City coordinates
│   ├── ryanlerch-Airplane-Roadsign-2.svg        # Plane svg icon
│   └── world.geojson                            # World map
├── images_persons/                              # Person photos
└── README.md, .gitignore
```

## Data Files

| File | Description |
|------|-------------|
| `flights.csv` | Flight records (date, origin, destination, passengers) |
| `persons.csv` | Person data |
| `persons_enriched.csv` | Enriched data with categories, bios, photos |
| `cities.json` | City/airport geolocation |
| `world.geojson` | World map boundaries |
| `ryanlerch-Airplane-Roadsign-2.svg` | Plane SVG icon used in the visualization |

