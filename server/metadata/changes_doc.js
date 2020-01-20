/**
 * Обрабатывает feed doc
 *
 * @module doc_changes
 *
 * Created by Evgeniy Malyarov on 20.01.2020.
 */

module.exports = function doc_changes({adapters: {pouch}, cat, pricing}, log) {

  // получаем список метаданных, кешируемых в doc
  const cnames = ['doc.nom_prices_setup', 'ireg.margin_coefficients'];
  cat.forEach((mgr) => {
    if(mgr.class_name !=='cat.characteristics' && (/^doc/.test(mgr.cachable) || /^doc/.test(mgr.metadata().original_cachable))) {
      cnames.push(mgr.class_name);
    }
  });

  pouch.remote.doc.changes({
    since: 'now',
    live: true,
    include_docs: true,
    selector: {class_name: {$in: cnames}}
  })
    .on('change', (change) => {
      if(change.id.startsWith('doc.nom_prices_setup')) {
        // формируем новый
        pricing.by_doc(change.doc);
        pouch.emit('nom_price');
      }
      else {
        pouch.load_changes({docs: [change.doc]});
        pouch.emit('ram_change', change);
      }
    })
    .on('error', (err) => {
      log(`change error ${err}`);
    });

}
