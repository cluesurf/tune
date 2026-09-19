/**
 * The OBO ontologies, which are the naming registries for the domains
 * no word list covers.
 *
 * Anatomy, disease, food, cells, environment, plant parts, qualities
 * and units. Every one is an open ontology with a stable identifier
 * per term and a human-readable name, which is exactly the shape this
 * measurement needs.
 *
 * ## Why an ontology rather than a word list
 *
 * A word list says what words exist. An ontology says what THINGS
 * exist and what each is called, which is the better question when
 * asking how many roots a domain needs. It also carries synonyms
 * marked as synonyms, so the count of concepts and the count of names
 * are both available and do not have to be guessed apart.
 *
 * ## The format, and why it parses in thirty lines
 *
 * OBO is stanza based and line oriented:
 *
 * ```text
 * [Term]
 * id: UBERON:0002107
 * name: liver
 * synonym: "hepatic organ" EXACT []
 * is_a: UBERON:0002365 ! exocrine gland
 * ```
 *
 * Every field is `key: value` and a blank line ends a stanza. There is
 * no nesting and no quoting outside the synonym field, so a reader is
 * a state machine over lines rather than a parser. **The one thing to
 * get right is the synonym line**, which holds a quoted string and a
 * scope, and that is one regular expression.
 *
 * `is_a` is kept because it gives the head: a term whose parent is
 * `bone` is a kind of bone, and that is the same signal the geology
 * corpus gives by putting the head last.
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

import { DATASETS } from './read'

export type Term = {
  id: string
  name: string
  /** Names for the same thing, which cost no concept. */
  synonyms: Array<string>
  /** Parent ids, which say what kind of thing this is. */
  parents: Array<string>
  obsolete: boolean
}

/**
 * Read one ontology.
 *
 * Obsolete terms are dropped. An ontology keeps its retired terms with
 * `is_obsolete: true` so old data still resolves, and counting them
 * would inflate every domain by whatever its churn has been.
 */
export function readObo(slug: string, file: string): Array<Term> {
  const path = resolve(DATASETS, slug, file)
  if (!existsSync(path)) return []

  const out: Array<Term> = []
  let now: Term | null = null

  for (const raw of readFileSync(path, 'utf-8').split('\n')) {
    const line = raw.trim()

    if (line === '[Term]') {
      if (now && now.name && !now.obsolete) out.push(now)
      now = { id: '', name: '', synonyms: [], parents: [], obsolete: false }
      continue
    }
    // Any other stanza kind ends the term and starts nothing.
    if (line.startsWith('[')) {
      if (now && now.name && !now.obsolete) out.push(now)
      now = null
      continue
    }
    if (!now) continue

    const at = line.indexOf(': ')
    if (at < 0) continue
    const key = line.slice(0, at)
    const value = line.slice(at + 2).trim()

    if (key === 'id') now.id = value
    else if (key === 'name') now.name = value
    else if (key === 'is_obsolete') now.obsolete = value === 'true'
    else if (key === 'is_a') now.parents.push(value.split(' ')[0])
    else if (key === 'synonym') {
      const hit = /^"((?:[^"\\]|\\.)*)"/.exec(value)
      if (hit) now.synonyms.push(hit[1].replace(/\\"/g, '"'))
    }
  }
  if (now && now.name && !now.obsolete) out.push(now)

  return out
}

/**
 * The sources that are a plain list of names, one per line.
 *
 * MeSH is 2 GB of n-triples and QUDT is turtle, and neither needs
 * parsing for this question: every label is one `rdfs:label` triple on
 * its own line. `tmp/extract-labels.sh` pulls the strings out and this
 * reads the result.
 *
 * A graph parser would be right if anything asked about the relations.
 * Nothing here does, and reading 2 GB into a triple store to count
 * words would be answering a question nobody asked.
 */
export const PLAIN: Array<{
  slug: string
  file: string
  domain: string
  what: string
}> = [
  {
    slug: 'mesh-medical',
    file: 'labels.txt',
    domain: 'medicine.mesh',
    what: 'every medical subject heading, drugs included',
  },
  {
    slug: 'qudt-quantity',
    file: 'labels.txt',
    domain: 'physics.quantity',
    what: 'the physical quantities that can be measured',
  },
  {
    slug: 'qudt-unit',
    file: 'labels.txt',
    domain: 'physics.unit.qudt',
    what: 'the units they are measured in',
  },
  {
    slug: 'getty-aat',
    file: 'labels.txt',
    domain: 'tool.artifact',
    what: 'tools, artifacts, materials and techniques',
  },
  {
    slug: 'wikidata-music',
    file: 'labels.txt',
    domain: 'music',
    what: 'instruments, forms and genres',
  },
  {
    slug: 'wikidata-law',
    file: 'labels.txt',
    domain: 'law',
    what: 'kinds of law and legal instrument',
  },
  {
    slug: 'wikidata-sport',
    file: 'labels.txt',
    domain: 'sport',
    what: 'sports and their kinds',
  },
  {
    slug: 'wikidata-clothing',
    file: 'labels.txt',
    domain: 'clothing',
    what: 'garments and textiles',
  },
]

export function readPlain(slug: string, file: string): Array<string> {
  const path = resolve(DATASETS, slug, file)
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf-8')
    .split('\n')
    .map(one => one.trim())
    .filter(one => one.length > 1 && one.length < 80)
}

/** Every ontology this project measures, and what it is a registry of. */
export const ONTOLOGY: Array<{
  slug: string
  file: string
  domain: string
  what: string
}> = [
  {
    slug: 'uberon-anatomy',
    file: 'uberon.obo',
    domain: 'anatomy',
    what: 'every body part across animals',
  },
  {
    slug: 'mondo-disease',
    file: 'mondo.obo',
    domain: 'disease',
    what: 'every named human disease',
  },
  {
    slug: 'foodon-food-full',
    file: 'foodon.obo',
    domain: 'food',
    what: 'foods, ingredients and dishes',
  },
  {
    // `chebi-chemicals/chebi.obo` holds 22,547 names and
    // `chebi-chemistry/chebi_lite.obo` holds 218,542. The measurement
    // ran on the smaller one for most of this session and reported
    // chemistry as a 22,547-term domain, which is a tenth of it.
    //
    // **`lite` names the ANNOTATION depth, not the term count.** The
    // lite build drops the definitions and cross-references and keeps
    // every term; the other file is a curated subset. A filename is
    // not a size.
    slug: 'chebi-chemistry',
    file: 'chebi_lite.obo',
    domain: 'chemistry',
    what: 'chemicals of biological interest, the full ontology',
  },
  {
    slug: 'pato-quality',
    file: 'pato.obo',
    domain: 'quality',
    what: 'the properties a thing can have',
  },
  {
    slug: 'po-plant-ontology',
    file: 'po.obo',
    domain: 'plant-part',
    what: 'plant structures and growth stages',
  },
  {
    slug: 'cl-cell-ontology',
    file: 'cl-basic.obo',
    domain: 'cell',
    what: 'every named cell type',
  },
  {
    slug: 'envo-environment',
    file: 'envo.obo',
    domain: 'environment',
    what: 'biomes, landforms and habitats',
  },
  {
    slug: 'uo-units',
    file: 'uo.obo',
    domain: 'physics.unit',
    what: 'units of measurement',
  },
  {
    slug: 'hpo-phenotype',
    file: 'hp.obo',
    domain: 'medicine.sign',
    what: 'symptoms and signs a body shows',
  },
  {
    slug: 'ncit-thesaurus',
    file: 'ncit.obo',
    domain: 'medicine.all',
    what: 'drugs, procedures, findings, the NCI thesaurus',
  },
  {
    slug: 'foodon-food-full',
    file: 'foodon.obo',
    domain: 'food.full',
    what: 'foods, ingredients, dishes and processes',
  },
]
