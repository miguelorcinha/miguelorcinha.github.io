/* ==========================================================================
   SITE CONTENT: edit this file to change the text on the website.
   Publications and talks are read automatically from the .bib files in bib/.
   Only entries whose `keywords` contain ORCINHA are shown.
   ========================================================================== */

window.SITE = {
  name: "Miguel Reis Orcinha",
  brandLabel: "Astroparticle physics",   // small line under your name in the header
  eyebrow: "Astroparticle physics · Heliosphere · Space weather",

  // The hero sentence. Wrap one word in *stars* to colour it.
  lead: "I study how the Sun *modulates* the galactic cosmic rays that reach the Earth, using AMS-02 data from the International Space Station.",

  // Affiliations under the hero.
  affiliations: [
    "Postdoc · INFN Perugia",
    "Member · AMS-02 Collaboration",
    "PhD · IST Lisbon"
  ],

  cv: "files/cv_morcinha_20261112.pdf",

  // Profile links shown in the footer and the contact section. Leave url empty to hide one.
  links: [
    { label: "Google Scholar", url: "https://scholar.google.com/citations?user=Xp7cCeIAAAAJ" },
    { label: "INSPIRE-HEP",    url: "https://inspirehep.net/literature?sort=mostrecent&size=25&page=1&q=orcinha" },
    { label: "ORCID",          url: "" },
    { label: "GitHub",         url: "https://github.com/miguelorcinha" },
    { label: "LinkedIn",       url: "" },
    { label: "AMS profile",    url: "https://ams02.space/collaboration/collaborator/miguel-reis-orcinha" }
  ],
  email: "",   // e.g. "name [at] pg.infn.it". Leave empty to hide.

  researchIntro: "Three connected lines of work, from measuring the flux to predicting it.",

  /* Research topics. Each one becomes a tab.
     - figure: path to an image (e.g. "images/research/modulation.png"); leave "" to show the built-in sketch.
     - keywords: words in a paper title that put it in this topic automatically.
     - include / exclude: bib keys to force into or out of this topic. */
  topics: {
    modulation: {
      tab: "Solar modulation",
      title: "Modelling the solar modulation of cosmic rays",
      text: "How does the heliosphere reshape the spectrum of galactic cosmic rays? I develop numerical solutions of the Parker transport equation and data-driven models such as PgLis, constrained by AMS-02 proton, helium and antiparticle fluxes, and use them for long-term flux and dose-rate forecasts.",
      figure: "",
      caption: "Proton spectra at solar minimum and maximum (sketch).",
      keywords: ["model", "transport", "diffusion", "forecast", "pglis", "modulation index", "simulation", "heliospheric modulation"],
      include: [],
      exclude: []
    },
    variability: {
      tab: "Time variability",
      title: "Time variability of the galactic cosmic-ray flux",
      text: "The cosmic-ray flux responds to solar activity with a delay of several months. I measure that time lag, its dependence on rigidity and solar cycle, and the periodicities in daily fluxes, using cross-correlation and spectral analysis.",
      figure: "",
      caption: "Solar activity and the delayed response of the cosmic-ray flux (sketch).",
      keywords: ["time lag", "time-lag", "variab", "periodic", "temporal", "daily", "time structure", "solar cycle", "cross-correlation", "hourly"],
      include: [],
      exclude: []
    },
    ams: {
      tab: "AMS fluxes",
      title: "AMS-02 flux measurements",
      text: "As a member of the AMS Collaboration I work on the time-resolved proton fluxes measured on the International Space Station, including daily fluxes and solar energetic particle (SEP) events.",
      figure: "",
      caption: "Daily proton flux with two SEP events (sketch).",
      keywords: ["ams", "alpha magnetic"],   // AMS Collaboration papers are always in this topic
      include: [],
      exclude: []
    }
  },

  // How many papers each research tab lists, and how many recent papers the home page shows.
  papersPerTopic: 4,
  recentShown: 3
};
