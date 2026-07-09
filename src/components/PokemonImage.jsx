import { memo, useState, useCallback } from "react";

export const PokemonImage = memo(({ pokeId, name }) => {
  const [attempt, setAttempt] = useState(0);
  const urls = [
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vii/icons/${pokeId}.png`,
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${pokeId}.png`,
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeId}.png`,
  ];
  const handleError = useCallback(() => {
    if (attempt < urls.length - 1) setAttempt((prev) => prev + 1);
  }, [attempt, urls.length]);

  return (
    <img
      src={urls[attempt]}
      alt={name}
      aria-hidden="true"
      onError={handleError}
      
    />
  );
});
PokemonImage.displayName = "PokemonImage";
