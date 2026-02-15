// src/app/components/cards/playOptionCard.js
"use client";

import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Image from "next/image";
import { hasActiveGame, getActiveGameUrl } from "@/lib/game-utils";

export default function PlayOptionCard({ title, description, image, link }) {
  const router = useRouter();
  const gameState = useSelector((state) => state.game);

  const handleClick = (e) => {
    // Check if there's an active game
    if (hasActiveGame(gameState)) {
      e.preventDefault();
      const gameUrl = getActiveGameUrl(gameState);
      router.push(gameUrl);
      return;
    }

    // If link is provided and no active game, navigate normally
    if (link) {
      router.push(link);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group relative flex items-center gap-6 rounded-2xl md:rounded-full border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer"
    >
      {/* decorative soft circle (like the original) */}
      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-blue-500/10 blur-3xl transition-all duration-500 group-hover:bg-blue-500/20" />

      {/* left: circular image */}
      <div className="relative h-20 w-20 rounded-full overflow-hidden flex-shrink-0 transition-transform duration-500 group-hover:scale-105">
        <Image
          src={image}
          alt={title}
          width={80}
          height={80}
          className="object-cover"
        />
      </div>

      {/* right: title + description */}
      <div className="flex flex-col items-start gap-1">
        <h2 className="text-lg font-semibold tracking-tight text-white transition-colors group-hover:text-blue-400">
          {title}
        </h2>
        <p className="text-sm text-gray-400 leading-snug">{description}</p>
      </div>

      {/* subtle bottom gradient line that appears on hover */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  );
}
