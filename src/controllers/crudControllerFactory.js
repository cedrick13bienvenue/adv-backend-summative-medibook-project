const { parseId, parseBody, parsePagination } = require('../validators/requestParsers');
const { notFound } = require('../utils/errors');

function createCrudController({ resource, basePath, model, schema, parseListFilters = () => ({}) }) {
  async function findOr404(id) {
    const record = await model.findById(id);
    if (!record) throw notFound(resource, id);
    return record;
  }

  async function list(req, res) {
    const { limit, offset } = parsePagination(req.query);
    const filters = parseListFilters(req.query);
    const { rows, total } = await model.findAll({ limit, offset, ...filters });
    res.json({ data: rows, pagination: { limit, offset, total } });
  }

  async function getOne(req, res) {
    const id = parseId(req.params.id);
    res.json({ data: await findOr404(id) });
  }

  async function create(req, res) {
    const fields = parseBody(req.body, schema);
    const id = await model.create(fields);
    res.status(201).location(`${basePath}/${id}`).json({ data: await model.findById(id) });
  }

  async function update(req, res) {
    const id = parseId(req.params.id);
    const fields = parseBody(req.body, schema, { partial: true });
    const updated = await model.update(id, fields);
    if (!updated) throw notFound(resource, id);
    res.json({ data: await model.findById(id) });
  }

  async function remove(req, res) {
    const id = parseId(req.params.id);
    const removed = await model.remove(id);
    if (!removed) throw notFound(resource, id);
    res.status(204).end();
  }

  return { list, getOne, create, update, remove };
}

module.exports = { createCrudController };
