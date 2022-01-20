/**
 * Возвращает пачку эскизов изделий заказа
 *
 * @module svgs
 *
 * Created by Evgeniy Malyarov on 16.01.2022.
 */

const getBody = require('./raw-body');

module.exports = function ({doc, pouch, utils}, log) {

  return function svgs({req, res, query, target}) {
    const {paths} = req.parsed;
    if(req.method === 'POST' && query && query.includes('svgs') && paths[paths.length-1].includes('doc.calc_order')) {
      const ref = paths[paths.length-1].replace('%7C', '|').substr(15);
      const o = doc.calc_order.by_ref[ref];
      const keys = [];
      res.setHeader('Content-Type', 'application/json');
      if(o && o.obj_delivery_state == 'Шаблон') {
        o.production.forEach(({characteristic: {ref, svg}}) => {
          if(svg) {
            keys.push({ref, svg, obj_delivery_state: 'Шаблон'});
          }
        });
        res.end(JSON.stringify({ok: true, keys}));
      }
      else {
        getBody(req)
          .then(async (data) => {
            const o = await pouch.fetch(target).then(r => r.json());
            const refs = [];
            if(o.production) {
              for(const {characteristic} of o.production) {
                if(!utils.is_empty_guid(characteristic)) {
                  refs.push(`cat.characteristics|${characteristic}`);
                }
              }
              const fin = paths[paths.length-1] + `?${query}`;
              const {docs} = await pouch.fetch(target.replace(fin, '_find'), {
                method: 'POST',
                body: JSON.stringify({
                  selector: {_id: {$in: refs}},
                  fields: ['_id', 'svg']
                })
              }).then(r => r.json());
              for(const {characteristic} of o.production) {
                if(!utils.is_empty_guid(characteristic)) {
                  const _id = `cat.characteristics|${characteristic}`;
                  const row = docs.find((v) => v._id === _id);
                  if(row) {
                    keys.push({ref: characteristic, svg: row.svg, obj_delivery_state: 'Шаблон'});
                  }
                }
              }
            }
            res.end(JSON.stringify({ok: true, keys}));
          })
          .catch((err) => {
            res.end(JSON.stringify({ok: false, err: err.message}));
          });
      }
      return true;
    }
  };
}
