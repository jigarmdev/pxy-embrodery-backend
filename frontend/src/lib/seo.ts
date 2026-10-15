/** Single source of truth for SEO (search), AEO (answer engines) and GEO (generative engines). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const SITE_NAME = 'jb888 Studio';
export const SITE_TAGLINE = 'Free online embroidery digitizing: logo to stitch file';
export const SITE_DESCRIPTION =
  'Convert a logo or image into a machine-ready embroidery file online. Choose fabric and stitch type, preview realistic thread, and export DST, PES, JEF, EXP, VP3 or XXX with stitch count, thread and cost estimates.';

export const KEYWORDS = [
  'embroidery digitizing', 'logo to embroidery', 'image to DST', 'PNG to embroidery file', 'online embroidery software',
  'DST file converter', 'PES file export', 'stitch count calculator', 'embroidery simulator', 'tatami fill', 'satin stitch',
  'embroidery thread preview', 'auto digitizing',
];

export const FORMATS = [
  { id: 'DST', brands: 'Tajima and most commercial machines', colours: false },
  { id: 'PES', brands: 'Brother, Babylock', colours: true },
  { id: 'JEF', brands: 'Janome', colours: true },
  { id: 'EXP', brands: 'Melco, Bernina', colours: false },
  { id: 'VP3', brands: 'Husqvarna Viking, Pfaff', colours: true },
  { id: 'XXX', brands: 'Singer', colours: true },
];

export const HOW_TO = [
  { name: 'Upload your artwork', text: 'Drag and drop a PNG, JPG, WEBP or SVG logo, paste it from the clipboard, or start from a sample design or lettering. A transparent background works best.' },
  { name: 'Choose fabric and stitch method', text: 'Pick the fabric, then a stitch method. Auto mode uses tatami fill for wide areas, satin columns for strokes and running stitch for hairlines.' },
  { name: 'Preview the stitched result', text: 'Check the realistic thread preview, the real DST file view with hoop and rulers, a close-up, the colour chart and the needle path. Stitch count, sew time and cost update live.' },
  { name: 'Export for your machine', text: 'Download DST, PES, JEF, EXP, VP3 or XXX. VP3, PES and JEF keep exact thread colours; DST stores colour changes only.' },
];

/** Plain question/answer pairs: rendered on the page AND emitted as FAQPage JSON-LD, so they always match. */
export const FAQS = [
  { q: 'What is embroidery digitizing?', a: 'Embroidery digitizing converts artwork such as a logo into a stitch file: a list of needle positions, stitch types and colour changes that an embroidery machine can sew.' },
  { q: 'How do I convert a logo or image to a DST file?', a: 'Upload the image to jb888 Studio, choose a fabric and stitch method, check the preview and click Export. The DST file is generated from the real stitch data, ready for Tajima and most commercial machines.' },
  { q: 'Which embroidery file formats can I export?', a: 'DST, PES, JEF, EXP, VP3 and XXX. That covers Tajima, Brother, Janome, Melco, Bernina, Husqvarna Viking, Pfaff and Singer machines.' },
  { q: 'Does DST store thread colours?', a: 'No. DST only stores colour-change commands, so the machine operator assigns threads. PES, JEF, VP3 and XXX store the exact RGB thread colours.' },
  { q: 'Which stitch types are supported?', a: 'More than 25 methods including tatami fill, satin column, running stitch, zigzag, cross-stitch and more. Auto mode picks tatami for wide areas, satin for strokes and running stitch for hairlines.' },
  { q: 'What image works best for embroidery?', a: 'Flat artwork with few solid colours and a transparent or plain background. Photos and gradients need to be reduced to 1 to 12 colours first, and very fine detail may be lost at small sizes.' },
  { q: 'Can I check stitch count, sew time and cost before sewing?', a: 'Yes. The studio measures stitch count, thread length, number of colours, design size, sew time and complexity from the generated design, and estimates material and labour cost against your budget.' },
  { q: 'Can I open an existing DST file?', a: 'Yes. Open any .dst file to view it with thread rendering, rulers, a hoop overlay, a measure tool and playback, and get its full analysis.' },
  { q: 'Is my artwork private?', a: 'Your image is sent only to the stitch generator to create the design; it is not published. Check your deployment\'s privacy policy for retention details.' },
];

export const PAGES = {
  home: { path: '/', title: 'Logo to Embroidery File Converter (DST, PES, JEF)', description: SITE_DESCRIPTION },
  designArea: { path: '/design-area', title: 'Design Area Detection for Embroidery', description: 'Automatically find the printable or embroiderable design area on a product image, with measurements and placement guidance.' },
  cueCase: { path: '/cuecase', title: '3D Cue Case Configurator', description: 'Configure a pool cue case in 3D: materials, colours and embroidery placement, with saved designs.' },
};

export const abs = (path: string) => `${SITE_URL}${path}`;
