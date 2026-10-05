/**
 * Jedyny „easter egg”: krótki komentarz w źródle HTML, dla kogoś,
 * kto zajrzy, jak strona jest zbudowana. Dopisywany przy prerenderze.
 */
const NOTE = `<!--
  Skoro tu zaglądasz, to chyba lubisz wiedzieć, jak rzeczy działają.
  Napisz: damian@dobrolinski.pl
-->`

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('render:html', (html) => {
    html.bodyPrepend.unshift(NOTE)
  })
})
