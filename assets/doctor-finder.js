/* SlashPromo doctor finder: use Slashcure as the source of truth for all current and future doctors. */
(() => {
  "use strict";
  const form = document.querySelector("[data-doctor-finder]");
  if (!form) return;
  const name = form.querySelector("[name=q]");
  const city = form.querySelector("[name=loc]");
  const specialty = form.querySelector("[name=specialty]");
  const chips = [...form.querySelectorAll("[data-finder-specialty]")];
  const directory = "https://slashcure.com/doctors";
  const knownCities = new Set([
    "sukkur","khairpur","shikarpur","ghotki","karachi","hyderabad","larkana",
    "lahore","islamabad","rawalpindi","peshawar","quetta","sheikhupura",
    "faisalabad","multan","bahawalpur","nawabshah","badin","thatta","gujranwala",
    "sialkot","abbottabad","mirpur-khas","dadu","jacobabad","ratodero","gambat",
    "pano-aqil","ubauro","gojra","tando-adam"
  ]);
  const slugify = text => text.trim().toLocaleLowerCase("en-PK")
    .replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-");
  const updateChips = () => chips.forEach(chip => {
    chip.setAttribute("aria-pressed", String(chip.dataset.finderSpecialty === specialty.value));
  });
  chips.forEach(chip => chip.addEventListener("click", () => {
    const selected = chip.dataset.finderSpecialty || "";
    specialty.value = specialty.value === selected ? "" : selected;
    updateChips();
    specialty.focus();
  }));
  specialty.addEventListener("change", updateChips);
  form.addEventListener("reset", () => setTimeout(updateChips,0));
  updateChips();
  form.addEventListener("submit", event => {
    event.preventDefault();
    const dest = new URL(directory);
    const q = name.value.trim().slice(0,120);
    const loc = city.value.trim().slice(0,100);
    const spec = specialty.value.trim();
    if (q) dest.searchParams.set("q", q);
    if (loc) {
      const citySlug = slugify(loc);
      if (knownCities.has(citySlug)) dest.searchParams.set("city",citySlug);
      else dest.searchParams.set("loc",loc);
    }
    if (spec) dest.searchParams.set("specialty",spec);
    window.location.assign(dest.toString());
  });
})();
