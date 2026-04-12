export interface Artifact {
  id: string;
  name: string;
  museum: string;
  museumDomain: string;
  emoji: string;
  description: string;
  era: string;
}

export const ARTIFACTS: Artifact[] = [
  {
    id: "rosetta-stone",
    name: "Rosetta Stone",
    museum: "British Museum",
    museumDomain: "britishmuseum.org",
    emoji: "🪨",
    description: "Ancient Egyptian decree inscribed in three scripts",
    era: "196 BC",
  },
  {
    id: "moai",
    name: "Easter Island Moai",
    museum: "British Museum",
    museumDomain: "britishmuseum.org",
    emoji: "🗿",
    description: "Monolithic human figure carved by the Rapa Nui people",
    era: "1000–1600 AD",
  },
  {
    id: "sutton-hoo",
    name: "Sutton Hoo Helmet",
    museum: "British Museum",
    museumDomain: "britishmuseum.org",
    emoji: "⛑️",
    description: "Anglo-Saxon ceremonial helmet from a ship burial",
    era: "7th century AD",
  },
  {
    id: "tutankhamun",
    name: "Tutankhamun's Mask",
    museum: "Egyptian Museum",
    museumDomain: "si.edu",
    emoji: "👑",
    description: "Gold funerary mask of the young pharaoh",
    era: "1323 BC",
  },
  {
    id: "elgin-marbles",
    name: "Elgin Marbles",
    museum: "British Museum",
    museumDomain: "britishmuseum.org",
    emoji: "🏛️",
    description: "Classical Greek marble sculptures from the Parthenon",
    era: "447–432 BC",
  },
];
