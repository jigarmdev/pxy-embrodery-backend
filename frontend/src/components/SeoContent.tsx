import { FAQS, FORMATS, HOW_TO } from '../lib/seo';

/** Crawlable, answer-first copy under the tool. Server-rendered so search and AI crawlers read it without running JS. */
export default function SeoContent() {
  return (
    <section aria-labelledby="about-heading" className="max-w-4xl mx-auto mt-16 space-y-12 text-gray-700">
      <div>
        <h2 id="about-heading" className="text-2xl font-extrabold text-gray-900 mb-3">What is jb888 Studio?</h2>
        <p className="leading-relaxed">
          jb888 Studio is an online embroidery digitizing tool. It turns a logo or image into a machine-ready stitch file and shows a realistic
          thread preview first, so you can check the result before you sew. It measures stitch count, thread length, sew time and cost, and
          recommends needle, stabilizer and thread for the fabric you choose.
        </p>
      </div>

      <div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-4">How to convert a logo to an embroidery file</h2>
        <ol className="space-y-3 list-decimal pl-5">
          {HOW_TO.map(s => (
            <li key={s.name} className="leading-relaxed"><strong className="text-gray-900">{s.name}.</strong> {s.text}</li>
          ))}
        </ol>
      </div>

      <div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-4">Supported embroidery file formats</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm text-left">
            <caption className="sr-only">Embroidery export formats, machine brands and whether thread colours are stored</caption>
            <thead className="bg-gray-50 text-gray-500">
              <tr><th scope="col" className="px-4 py-2">Format</th><th scope="col" className="px-4 py-2">Machines</th><th scope="col" className="px-4 py-2">Thread colours</th></tr>
            </thead>
            <tbody>
              {FORMATS.map(f => (
                <tr key={f.id} className="border-t border-gray-100">
                  <th scope="row" className="px-4 py-2 font-bold text-gray-900">{f.id}</th>
                  <td className="px-4 py-2">{f.brands}</td>
                  <td className="px-4 py-2">{f.colours ? 'Stored (exact RGB)' : 'Colour changes only'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-4">Frequently asked questions</h2>
        <div className="space-y-3">
          {FAQS.map(f => (
            <details key={f.q} className="group rounded-xl border border-gray-200 bg-surface px-4 py-3">
              <summary className="cursor-pointer font-semibold text-gray-900 list-none [&::-webkit-details-marker]:hidden flex justify-between gap-3">
                <h3 className="text-base font-semibold">{f.q}</h3><span aria-hidden className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="mt-2 leading-relaxed text-sm">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
