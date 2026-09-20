import { parseWhatsAppRundown } from "../whatsapp-parser"

const EXAMPLE = `
*Sunday Service Programme (Sunday 20/09/2026)*
1.) Opening Prayer with Devotion - 10:00-10:15 *(15mins)* (Dcns. Modupe)
2.) Sunday School - 10:15-11:05 *(50mins)* (SS Teachers)
3.) Praise & Worship - 11:05-11:25 *(20mins)* (Choir)
4.) Prayer Session - 11:25-11:35 *(10mins)* (Dcn. Akinbogun)
5.) Announcement - 11:35-11:42 *(7mins)* (Sis. Tolu)
6.) First Timer / Prayer for Family of the week - 11:42-11:50 *(8mins)* (Pst. Mike)
7.) Offering and Tithe - 11:50-11:57 *(7mins)* (Pst. Bayo)
8.) Message - 11:57-12:35 *(38mins)* (Pastor Segun)
9.) Benediction & Closing Hymn - 12:35-12:45 *(10mins)* (Pastor)
*Note: Please, let's keep to the allocated time.*
`

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++
  } else {
    failed++
    console.error(`  FAIL: ${msg}`)
  }
}

function run() {
  const { items, unrecognised } = parseWhatsAppRundown(EXAMPLE)

  console.log("--- WhatsApp Rundown Parser Tests ---\n")

  assert(items.length === 9, `expected 9 items, got ${items.length}`)
  assert(unrecognised.length === 0, `expected 0 unrecognised, got ${unrecognised.length}: ${JSON.stringify(unrecognised)}`)

  // Item 1
  assert(items[0].order === 1, `item 1 order: ${items[0].order}`)
  assert(items[0].title === "Opening Prayer with Devotion", `item 1 title: ${items[0].title}`)
  assert(items[0].startTime === "10:00", `item 1 start: ${items[0].startTime}`)
  assert(items[0].endTime === "10:15", `item 1 end: ${items[0].endTime}`)
  assert(items[0].durationMinutes === 15, `item 1 duration: ${items[0].durationMinutes}`)
  assert(items[0].assignedTo === "Dcns. Modupe", `item 1 assigned: ${items[0].assignedTo}`)
  assert(items[0].type === "prayer", `item 1 type: ${items[0].type}`)

  // Item 3 — Praise & Worship → song
  assert(items[2].title === "Praise & Worship", `item 3 title: ${items[2].title}`)
  assert(items[2].type === "song", `item 3 type: ${items[2].type}`)
  assert(items[2].assignedTo === "Choir", `item 3 assigned: ${items[2].assignedTo}`)

  // Item 5 — Announcement
  assert(items[4].title === "Announcement", `item 5 title: ${items[4].title}`)
  assert(items[4].type === "announcement", `item 5 type: ${items[4].type}`)
  assert(items[4].durationMinutes === 7, `item 5 duration: ${items[4].durationMinutes}`)

  // Item 6 — First Timer (transition, no specific keyword)
  assert(items[5].title === "First Timer / Prayer for Family of the week", `item 6 title: ${items[5].title}`)
  assert(items[5].type === "prayer", `item 6 type: ${items[5].type}`)

  // Item 7 — Offering and Tithe
  assert(items[6].type === "offering", `item 7 type: ${items[6].type}`)

  // Item 8 — Message → sermon
  assert(items[7].title === "Message", `item 8 title: ${items[7].title}`)
  assert(items[7].type === "sermon", `item 8 type: ${items[7].type}`)
  assert(items[7].durationMinutes === 38, `item 8 duration: ${items[7].durationMinutes}`)

  // Item 9 — Benediction & Closing Hymn → prayer (benediction keyword)
  assert(items[8].order === 9, `item 9 order: ${items[8].order}`)
  assert(items[8].assignedTo === "Pastor", `item 9 assigned: ${items[8].assignedTo}`)

  // Order is sequential
  items.forEach((item, i) => {
    assert(item.order === i + 1, `item ${i + 1} order sequential: ${item.order}`)
  })

  // Note line is excluded
  assert(!items.some((i) => i.title.toLowerCase().includes("note")), "Note line should be excluded")

  // Heading line is excluded
  assert(!items.some((i) => i.title.includes("Sunday Service Programme")), "Heading should be excluded")

  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
