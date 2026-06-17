// Maps a scent accord family to a representative hue. Used to paint a
// scent-colored gradient as card "art" when no real bottle photo is available
// (parfumo blocks image scraping), so the bento looks designed, not empty.

const ACCORD_COLORS: Record<string, string> = {
  woody: "#9C6B43", wood: "#9C6B43", cedar: "#9C6B43", cedarwood: "#9C6B43",
  sandalwood: "#B07D4F", oud: "#6E4A2F",
  floral: "#E39AB8", flower: "#E39AB8", rose: "#E0849C", jasmine: "#EAD08F",
  violet: "#B79AD6", lavender: "#9AA6D6", "white floral": "#EAD9C0", tuberose: "#E8C2C8",
  fresh: "#74C4A4", aromatic: "#83C097", green: "#8DB36A", herbal: "#8DB36A",
  citrus: "#F2C84B", fruity: "#EF9A52", tropical: "#F0A65A",
  sweet: "#E6AE63", gourmand: "#D8975A", vanilla: "#E7C98A", caramel: "#C98A4A",
  chocolate: "#7B4A2E", honey: "#E0AE4E", coffee: "#6F4A33", almond: "#E7C98A", nutty: "#C49A5C",
  spicy: "#C9603F", "warm spicy": "#C25B3A", "fresh spicy": "#D98B5A", cinnamon: "#B5552F",
  smoky: "#6B5648", smoke: "#6B5648", leather: "#7A5A41", leathery: "#7A5A41", tobacco: "#8A6A40",
  powdery: "#D6BFAA", musk: "#CDBBA8", musky: "#CDBBA8", iris: "#C9BBD0",
  aquatic: "#6FB6D6", marine: "#5FA8CF", water: "#74BBD8", ozonic: "#8FC9DE", watery: "#74BBD8",
  amber: "#C98A3C", oriental: "#B5793A", balsamic: "#A06B3C", resinous: "#9C6B3C",
  earthy: "#8A6E4E", animal: "#9C6B4E", animalic: "#9C6B4E",
  creamy: "#E6CBA8", coconut: "#E6D2B0", soapy: "#CFE0DC", clean: "#CFE0DC",
  mineral: "#AEB8B0", metallic: "#AEB8B0", mossy: "#7E8A5C", oakmoss: "#7E8A5C",
};

const FALLBACK: [string, string] = ["#C9A074", "#A87B53"]; // warm coffee duo

// Returns a two-stop gradient derived from a perfume's accords.
export function accordGradient(accords: string[]): [string, string] {
  const colors: string[] = [];
  for (const a of accords) {
    const key = a.toLowerCase().trim();
    const c = ACCORD_COLORS[key] || ACCORD_COLORS[key.split(" ")[0]];
    if (c && !colors.includes(c)) colors.push(c);
    if (colors.length >= 2) break;
  }
  if (colors.length === 0) return FALLBACK;
  if (colors.length === 1) return [colors[0], FALLBACK[1]];
  return [colors[0], colors[1]];
}
