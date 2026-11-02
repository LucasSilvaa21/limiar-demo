export function createRegistry(levels) {
  const byId = new Map();
  for (const level of levels) {
    if (!level.id || byId.has(level.id)) throw new Error(`Identificador de nível inválido: ${level.id}`);
    if (!level.name || !level.scene || !Array.isArray(level.prerequisites)) throw new Error(`Módulo incompleto: ${level.id}`);
    byId.set(level.id, level);
  }
  const visiting = new Set(); const visited = new Set();
  function visit(id) {
    if (!byId.has(id)) throw new Error(`Pré-requisito desconhecido: ${id}`);
    if (visiting.has(id)) throw new Error(`Dependência circular: ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id).prerequisites) visit(dependency);
    visiting.delete(id); visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
  return {
    levels: [...levels], get: id => byId.get(id),
    status(id, completed) {
      const level = byId.get(id);
      if (!level) return 'unknown';
      if (completed.has(id)) return 'complete';
      return level.prerequisites.every(required => completed.has(required)) ? 'available' : 'locked';
    },
    missing(id, completed) { return byId.get(id)?.prerequisites.filter(required => !completed.has(required)) || []; }
  };
}

export function loadProgress(storage, registry) {
  try {
    const data = JSON.parse(storage.getItem('limiar.atlas.v1'));
    if (data?.version !== 1 || !Array.isArray(data.completed)) return new Set();
    const candidates = new Set(data.completed.filter(id => typeof id === 'string' && registry.get(id)));
    const completed = new Set();
    for (let pass = 0; pass < registry.levels.length; pass++) {
      for (const id of candidates) if (registry.missing(id, completed).length === 0) completed.add(id);
    }
    return completed;
  } catch { return new Set(); }
}

export function saveProgress(storage, completed) {
  try { storage.setItem('limiar.atlas.v1', JSON.stringify({ version: 1, completed: [...completed] })); return true; }
  catch { return false; }
}
