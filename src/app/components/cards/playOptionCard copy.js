// src/app/components/cards/playOptionCard.js
import Image from "next/image";

export default function PlayOptionCard({ title, description, image }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-500 hover:border-white/20 hover:bg-white/10 hover:shadow-2xl hover:shadow-blue-500/20">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl transition-all duration-500 group-hover:bg-blue-500/20" />

      <div className="relative flex flex-col items-center gap-4 text-center">
        <div className="relative h-32 w-32 transition-transform duration-500 group-hover:scale-110">
          <Image
            src={image}
            alt={title}
            fill
            className="object-contain drop-shadow-2xl rounded-full"
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors">
            {title}
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    </div>
  );
}
