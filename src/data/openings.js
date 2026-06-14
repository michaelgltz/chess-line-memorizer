export const OPENINGS = [
  {
    id: "englund-white",
    name: "Englund Gambit Refutation",
    category: "White repertoire",
    description: "Train White's main responses against common Englund ideas.",
    variations: [
      {
        name: "Main queen raid line",
        line: `1. d4 e5 2. dxe5 Nc6 3. Nf3 Qe7 4. Bf4 Qb4+ 5. Bd2 Qxb2 6. Nc3 Bb4 7. Rb1 Qa3 8. Rb3 Qa5 9. a3 Bxc3 10. Bxc3 Qc5 11. e3`,
        explanations: {
          10: {
            "rb1": {
              title: "Rb1 is close, but Nc3 is more precise first.",
              text: "After the queen takes b2, White wants to develop with tempo and make sure the queen has no easy escape. Nc3 develops a piece and attacks the queen's neighborhood before committing the rook.",
              seeLine: `6. Rb1 Qa3 7. Nc3 Bb4`,
            },
          },
        },
      },
      {
        name: "Englund with early ...d6",
        line: `1. d4 e5 2. dxe5 d6 3. exd6 Bxd6 4. Nf3 Nf6 5. Bg5 O-O 6. e3 h6 7. Bh4`,
        explanations: {
          4: {
            "nxd6": {
              title: "Nxd6 is not available here.",
              text: "White's knight has not developed yet. The clean refutation is to accept the pawn with exd6 and let Black spend time recapturing.",
              seeLine: `3. exd6 Bxd6 4. Nf3`,
            },
          },
        },
      },
      {
        name: "Englund simple development line",
        line: `1. d4 e5 2. dxe5 Nc6 3. Nf3 f6 4. exf6 Nxf6 5. Bg5 d5 6. e3 Be7 7. Nc3 O-O`,
        explanations: {},
      },
      {
        name: "Englund queen tradeoff line",
        line: `1. d4 e5 2. dxe5 Nc6 3. Nf3 Qe7 4. Nc3 Nxe5 5. Nxe5 Qxe5 6. e4 Bb4 7. Bd3 Nf6 8. O-O`,
        explanations: {},
      },
    ],
  },
  {
    id: "london-white",
    name: "London System",
    category: "White repertoire",
    description: "Practice common London structures and move orders.",
    variations: [
      {
        name: "Basic London setup",
        line: `1. d4 d5 2. Nf3 Nf6 3. Bf4 e6 4. e3 Bd6 5. Bg3 O-O 6. Bd3 c5 7. c3 Nc6 8. Nbd2`,
        explanations: {
          8: {
            "bxd6": {
              title: "Trading on d6 too early is harmless for Black.",
              text: "The bishop trade gives up one of White's active pieces without forcing a concession. Bg3 keeps the bishop and asks Black how they want to resolve the tension.",
              seeLine: `5. Bxd6 Qxd6 6. Bd3 O-O`,
            },
          },
        },
      },
      {
        name: "London against ...c5",
        line: `1. d4 d5 2. Nf3 Nf6 3. Bf4 c5 4. e3 Nc6 5. c3 e6 6. Nbd2 Bd6 7. Bg3 O-O`,
        explanations: {},
      },
      {
        name: "London with early ...Bf5",
        line: `1. d4 d5 2. Nf3 Nf6 3. Bf4 Bf5 4. e3 e6 5. c4 c6 6. Nc3 Nbd7 7. Bd3`,
        explanations: {},
      },
      {
        name: "London against King's Indian setup",
        line: `1. d4 Nf6 2. Nf3 g6 3. Bf4 Bg7 4. e3 O-O 5. Be2 d6 6. h3 c5 7. c3 Nc6 8. O-O`,
        explanations: {},
      },
    ],
  },
  {
    id: "ruy-lopez-white",
    name: "Ruy Lopez (Spanish Game)",
    category: "White repertoire",
    description: "Train classical Spanish positions from the main line, Berlin, and Exchange structures.",
    variations: [
      {
        name: "Closed Spanish main line",
        line: `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3`,
        explanations: {
          8: {
            "bxc6": {
              title: "Bxc6 is a different structure.",
              text: "The closed Spanish keeps the bishop and builds pressure with Re1, c3, and h3. Trading on c6 is playable, but it commits to the Exchange variation instead of this main-line plan.",
              seeLine: `4. Ba4 Nf6 5. O-O Be7 6. Re1`,
            },
          },
        },
      },
      {
        name: "Berlin endgame",
        line: `1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. O-O Nxe4 5. d4 Nd6 6. Bxc6 dxc6 7. dxe5 Nf5 8. Qxd8+ Kxd8`,
        explanations: {},
      },
      {
        name: "Exchange structure",
        line: `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Bxc6 dxc6 5. O-O f6 6. d4 exd4 7. Nxd4 c5 8. Nb3 Qxd1 9. Rxd1`,
        explanations: {},
      },
      {
        name: "Open Spanish center",
        line: `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Nxe4 6. d4 b5 7. Bb3 d5 8. dxe5 Be6`,
        explanations: {},
      },
    ],
  },
  {
    id: "italian-white",
    name: "Italian Game",
    category: "White repertoire",
    description: "Practice flexible Italian setups, Two Knights move orders, and the Evans Gambit.",
    variations: [
      {
        name: "Giuoco Pianissimo",
        line: `1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. Re1 a6 8. Bb3`,
        explanations: {
          6: {
            "d4": {
              title: "d4 changes the character immediately.",
              text: "The quiet Italian keeps the center flexible with d3 first. Playing d4 is a sharper main line, but it is not the slow-pressure setup this drill is building.",
              seeLine: `4. c3 Nf6 5. d3 d6 6. O-O`,
            },
          },
        },
      },
      {
        name: "Two Knights with d3",
        line: `1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 5. c3 d6 6. O-O O-O 7. Re1 a6`,
        explanations: {},
      },
      {
        name: "Evans Gambit accepted",
        line: `1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d6 8. cxd4`,
        explanations: {},
      },
      {
        name: "Italian central break",
        line: `1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. e5 d5 7. Bb5 Ne4 8. cxd4`,
        explanations: {},
      },
    ],
  },
  {
    id: "scotch-game-white",
    name: "Scotch Game",
    category: "White repertoire",
    description: "Practice Scotch Game central play, including classical, Mieses, Four Knights, and gambit structures.",
    variations: [
      {
        name: "Classical Scotch pressure",
        line: `1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4 Bc5 5. Be3 Qf6 6. c3 Nge7 7. Bc4 O-O 8. O-O`,
        explanations: {},
      },
      {
        name: "Mieses variation",
        line: `1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4 Nf6 5. Nxc6 bxc6 6. e5 Qe7 7. Qe2 Nd5 8. c4 Ba6`,
        explanations: {},
      },
      {
        name: "Scotch Four Knights",
        line: `1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6 4. d4 exd4 5. Nxd4 Bb4 6. Nxc6 bxc6 7. Bd3 d5 8. exd5`,
        explanations: {},
      },
      {
        name: "Scotch Gambit",
        line: `1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Bc4 Bc5 5. c3 Nf6 6. e5 d5 7. Bb5 Ne4 8. cxd4`,
        explanations: {},
      },
    ],
  },
  {
    id: "queens-gambit-white",
    name: "Queen's Gambit",
    category: "White repertoire",
    description: "Practice Queen's Gambit structures against declined, accepted, and Albin setups.",
    variations: [
      {
        name: "QGD Exchange setup",
        line: `1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. cxd5 exd5 5. Bg5 Be7 6. e3 O-O 7. Bd3 c6 8. Qc2`,
        explanations: {
          8: {
            "nf3": {
              title: "Nf3 is natural, but Qc2 fits this plan.",
              text: "In the Exchange Queen's Gambit, Qc2 supports a future kingside plan and keeps the e4 break in view. Nf3 is playable, just a different setup.",
              seeLine: `5. Bg5 Be7 6. e3 O-O 7. Bd3 c6 8. Qc2`,
            },
          },
        },
      },
      {
        name: "Queen's Gambit Accepted",
        line: `1. d4 d5 2. c4 dxc4 3. e3 Nf6 4. Bxc4 e6 5. Nf3 c5 6. O-O a6 7. Qe2 b5 8. Bd3`,
        explanations: {},
      },
      {
        name: "Albin Countergambit",
        line: `1. d4 d5 2. c4 e5 3. dxe5 d4 4. Nf3 Nc6 5. a3 Be6 6. Nbd2 Qd7 7. b4 Nge7`,
        explanations: {},
      },
      {
        name: "Slav development line",
        line: `1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. e3 Bf5 5. Nc3 e6 6. Nh4 Bg6 7. Nxg6 hxg6`,
        explanations: {},
      },
    ],
  },
  {
    id: "sicilian-black",
    name: "Sicilian Defense",
    category: "Black vs e4",
    description: "Practice a few common Black replies in open Sicilian structures.",
    variations: [
      {
        name: "Najdorf-style setup",
        line: `1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be2 e5 7. Nb3 Be7 8. O-O O-O`,
        explanations: {},
      },
      {
        name: "Classical development",
        line: `1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 d6 6. Be2 e6 7. O-O Be7`,
        explanations: {},
      },
      {
        name: "Dragon-style setup",
        line: `1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3 Bg7 7. f3 O-O`,
        explanations: {},
      },
      {
        name: "Alapin structure",
        line: `1. e4 c5 2. c3 Nf6 3. e5 Nd5 4. d4 cxd4 5. Nf3 e6 6. cxd4 d6 7. Bc4 Nc6`,
        explanations: {},
      },
    ],
  },
  {
    id: "caro-kann-black",
    name: "Caro-Kann Defense",
    category: "Black vs e4",
    description: "Train reliable Caro-Kann structures against Advance, Classical, and Panov systems.",
    variations: [
      {
        name: "Advance variation",
        line: `1. e4 c6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 5. Be2 c5 6. O-O Nc6 7. c3 Nge7`,
        explanations: {
          5: {
            "bg4": {
              title: "Develop the light-square bishop first.",
              text: "In the Advance Caro-Kann, Bf5 gets the problem bishop outside the pawn chain before ...e6. That is the core setup this line is training.",
              seeLine: `3. e5 Bf5 4. Nf3 e6 5. Be2 c5`,
            },
          },
        },
      },
      {
        name: "Classical variation",
        line: `1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6 7. Nf3 Nd7`,
        explanations: {},
      },
      {
        name: "Panov-Botvinnik setup",
        line: `1. e4 c6 2. d4 d5 3. exd5 cxd5 4. c4 Nf6 5. Nc3 e6 6. Nf3 Bb4 7. Bd3 dxc4`,
        explanations: {},
      },
      {
        name: "Exchange Caro-Kann",
        line: `1. e4 c6 2. d4 d5 3. exd5 cxd5 4. Bd3 Nc6 5. c3 Nf6 6. Bf4 e6 7. Nd2 Bd6 8. Bxd6 Qxd6`,
        explanations: {},
      },
    ],
  },
  {
    id: "scandinavian-defense",
    name: "Scandinavian Defense",
    category: "Black vs e4",
    description: "Practice Scandinavian structures with the main queen line, Modern setup, and Portuguese-style development.",
    variations: [
      {
        name: "Main line with ...Qa5",
        line: `1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5 4. d4 Nf6 5. Nf3 c6 6. Bc4 Bf5 7. O-O e6`,
        explanations: {
          5: {
            "qd8": {
              title: "Qa5 keeps active pressure.",
              text: "The main Scandinavian queen line uses ...Qa5 to keep an eye on c3 and support quick development. Retreating all the way to d8 is playable, but it is a different, quieter system.",
              seeLine: `2. exd5 Qxd5 3. Nc3 Qa5 4. d4 Nf6`,
            },
          },
        },
      },
      {
        name: "Modern Scandinavian",
        line: `1. e4 d5 2. exd5 Nf6 3. d4 Nxd5 4. c4 Nb6 5. Nc3 g6 6. Be3 Bg7 7. Rc1 O-O`,
        explanations: {},
      },
      {
        name: "Portuguese variation",
        line: `1. e4 d5 2. exd5 Nf6 3. d4 Bg4 4. f3 Bf5 5. c4 e6 6. dxe6 Nc6 7. exf7+ Kxf7`,
        explanations: {},
      },
      {
        name: "Queen retreat to d8",
        line: `1. e4 d5 2. exd5 Qxd5 3. Nc3 Qd8 4. d4 Nf6 5. Nf3 c6 6. Bc4 Bf5 7. Ne5 e6`,
        explanations: {},
      },
    ],
  },
  {
    id: "french-black",
    name: "French Defense",
    category: "Black vs e4",
    description: "Practice French Defense pawn-chain play against Advance, Tarrasch, and Winawer lines.",
    variations: [
      {
        name: "Advance variation pressure",
        line: `1. e4 e6 2. d4 d5 3. e5 c5 4. c3 Nc6 5. Nf3 Qb6 6. Be2 cxd4 7. cxd4 Nge7`,
        explanations: {
          6: {
            "nf6": {
              title: "Qb6 attacks the base of the chain.",
              text: "The French Advance plan is to hit d4 and b2 before White finishes development. Qb6 makes that pressure immediate.",
              seeLine: `3. e5 c5 4. c3 Nc6 5. Nf3 Qb6`,
            },
          },
        },
      },
      {
        name: "Tarrasch with ...Qxd5",
        line: `1. e4 e6 2. d4 d5 3. Nd2 c5 4. exd5 Qxd5 5. Ngf3 cxd4 6. Bc4 Qd6 7. O-O Nf6`,
        explanations: {},
      },
      {
        name: "Winawer main structure",
        line: `1. e4 e6 2. d4 d5 3. Nc3 Bb4 4. e5 c5 5. a3 Bxc3+ 6. bxc3 Ne7 7. Qg4 Qc7`,
        explanations: {},
      },
      {
        name: "Exchange French",
        line: `1. e4 e6 2. d4 d5 3. exd5 exd5 4. Nf3 Nf6 5. Bd3 Bd6 6. O-O O-O 7. Bg5 c6`,
        explanations: {},
      },
    ],
  },
  {
    id: "kings-indian-black",
    name: "King's Indian Defense",
    category: "Black vs d4",
    description: "Practice King's Indian setups against Classical, Fianchetto, and Saemisch systems.",
    variations: [
      {
        name: "Classical King's Indian",
        line: `1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5 7. O-O Nc6`,
        explanations: {
          8: {
            "c5": {
              title: "In this line, castle before striking the center.",
              text: "The King's Indian setup usually finishes king safety first, then challenges the center with ...e5. Playing ...c5 immediately is playable in other systems, but not this trained pattern.",
              seeLine: `4. e4 d6 5. Nf3 O-O 6. Be2 e5`,
            },
          },
        },
      },
      {
        name: "Fianchetto system",
        line: `1. d4 Nf6 2. c4 g6 3. g3 Bg7 4. Bg2 O-O 5. Nf3 d6 6. O-O Nbd7 7. Nc3 e5`,
        explanations: {},
      },
      {
        name: "Saemisch setup",
        line: `1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. f3 O-O 6. Be3 e5 7. Nge2 c6`,
        explanations: {},
      },
      {
        name: "Averbakh system",
        line: `1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Be2 O-O 6. Bg5 c5 7. d5 e6`,
        explanations: {},
      },
    ],
  },
  {
    id: "nimzo-indian-black",
    name: "Nimzo-Indian Defense",
    category: "Black vs d4",
    description: "Train Nimzo-Indian development against Rubinstein, Classical, and Leningrad setups.",
    variations: [
      {
        name: "Rubinstein variation",
        line: `1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3 O-O 5. Bd3 d5 6. Nf3 c5 7. O-O dxc4 8. Bxc4`,
        explanations: {
          6: {
            "bxc3+": {
              title: "Hold the bishop tension for now.",
              text: "Black can often give up the bishop pair later, but this Rubinstein line first castles and challenges the center with ...d5 and ...c5.",
              seeLine: `3. Nc3 Bb4 4. e3 O-O 5. Bd3 d5`,
            },
          },
        },
      },
      {
        name: "Classical Qc2 line",
        line: `1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. Qc2 O-O 5. a3 Bxc3+ 6. Qxc3 b6 7. Bg5 Bb7`,
        explanations: {},
      },
      {
        name: "Leningrad variation",
        line: `1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. Bg5 h6 5. Bh4 c5 6. d5 d6 7. e3 Bxc3+`,
        explanations: {},
      },
      {
        name: "Saemisch structure",
        line: `1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. a3 Bxc3+ 5. bxc3 O-O 6. e3 c5 7. Bd3 Nc6`,
        explanations: {},
      },
    ],
  },
  {
    id: "english-white",
    name: "English Opening",
    category: "White repertoire",
    description: "Practice English Opening structures with kingside fianchetto and flexible central play.",
    variations: [
      {
        name: "Four Knights English",
        line: `1. c4 e5 2. Nc3 Nf6 3. g3 d5 4. cxd5 Nxd5 5. Bg2 Nb6 6. Nf3 Nc6 7. O-O Be7`,
        explanations: {
          5: {
            "d4": {
              title: "Keep the English move order flexible.",
              text: "The fianchetto setup delays d4 until White knows how Black is arranging the pieces. Bg2 is the natural developing move in this repertoire.",
              seeLine: `3. g3 d5 4. cxd5 Nxd5 5. Bg2`,
            },
          },
        },
      },
      {
        name: "Symmetrical English",
        line: `1. c4 c5 2. Nc3 Nc6 3. g3 g6 4. Bg2 Bg7 5. Nf3 e6 6. O-O Nge7`,
        explanations: {},
      },
      {
        name: "Reversed Sicilian setup",
        line: `1. c4 e5 2. Nc3 Nc6 3. g3 g6 4. Bg2 Bg7 5. e3 d6 6. Nge2 Be6`,
        explanations: {},
      },
      {
        name: "Botvinnik setup",
        line: `1. c4 e5 2. Nc3 Nc6 3. g3 g6 4. Bg2 Bg7 5. e4 d6 6. Nge2 f5 7. d3 Nf6`,
        explanations: {},
      },
    ],
  },
  {
    id: "sicilian-white",
    name: "Sicilian Najdorf Response",
    category: "White repertoire",
    description: "Practice White's response after Black plays ...a6 in the Sicilian.",
    variations: [
      {
        name: "Quiet Be2 line",
        line: `1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be2 e5 7. Nb3 Be7 8. O-O O-O`,
        explanations: {
          10: {
            "bxa6": {
              title: "Bxa6 wins a pawn but loses the bishop.",
              text: "The bishop can take on a6, but Black can simply recapture with the b8-knight. White gives up a bishop for a pawn and helps Black develop.",
              seeLine: `6. Bxa6 Nxa6 7. O-O e5 8. Nb3 Be7`,
            },
          },
        },
      },
      {
        name: "English Attack setup",
        line: `1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 8. f3 Be7 9. Qd2 O-O`,
        explanations: {},
      },
      {
        name: "Bg5 pressure line",
        line: `1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bg5 e6 7. f4 Be7 8. Qf3 h6 9. Bh4 Qc7`,
        explanations: {},
      },
    ],
  },
];
