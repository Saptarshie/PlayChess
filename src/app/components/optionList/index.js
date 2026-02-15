// src/app/components/optionList/index.js
"use client";

import PlayOptionCard from "../cards/playOptionCard";

export default function OptionList() {
  const options = [
    {
      title: "PLAY ONLINE",
      description:
        "Play chess with players from around the world and climb the leaderboards.",
      image: "/images/playOnline.jpg",
      link: "/game-control",
    },
    {
      title: "PLAY WITH FRIEND",
      description:
        "Challenge your friends to a friendly match in your own private room.",
      image: "/images/playWithFriend.jpg",
    },
    {
      title: "PLAY WITH AI",
      description:
        "Practice your skills against our advanced chess engine at various levels.",
      image: "/images/playWithAI.jpg",
    },
    {
      title: "SOLVE PUZZLES",
      description:
        "Improve your tactical vision with curated puzzles for all skill levels.",
      image: "/images/solvePuzzles.jpg",
    },
    {
      title: "PUZZLE OF THE DAY",
      description:
        "A daily challenge to keep your brain sharp. Can you solve it?",
      image: "/images/puzzleOfTheDay.png",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((option) => (
        <PlayOptionCard
          key={option.title}
          title={option.title}
          description={option.description}
          image={option.image}
          link={option.link}
        />
      ))}
    </div>
  );
}
