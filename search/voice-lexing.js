const chevrotain = require("chevrotain")
const Lexer = chevrotain.Lexer
const createToken = chevrotain.createToken

const tokenVocabulary = {}

//regexp-to-ast.js does not support \p{Ll} or \p{Lu} see chevrotain issues 777
const Word = createToken({ name: "Word", pattern: /(([([]?\^?(\|?[-._@'0-9a-zäöüßḍēṛṯẓūīōāšḏṭǧḥžḷəṣḏ̣ʕġḅṃʔ}](?!:)(?![a-z]:)([+*?]|\{[0-9],?([0-9]+)?\})?)+([\])]([+*?]|\{[0-9],?([0-9]+)?\})?)?)|\\[wd]([+*?]|\{[0-9],?([0-9]+)?\})?)+/}) // [._@0-9a-zäöüß\])*?+]
const Pos = createToken({ name: "Pos", pattern: /(([([]?\^?(\|?f?[-.A-Z]([+*?]|\{[0-9],?([0-9]+)?\})?)+([\])]([+*?]|\{[0-9],?([0-9]+)?\})?)?)|\\[wd]([+*?]|\{[0-9],?([0-9]+)?\})?)+/}) // [.A-Z\])*?+]
const Tag = createToken({ name: "Tag", pattern: /<[^>]+>/})
const LParen = createToken({ name: "LParen", pattern: /\(/})
const RParen = createToken({ name: "RParen", pattern: /\)/})
const Space = createToken({ name: "Space", pattern: / +/})
const Quants = createToken({ name: "Quants", pattern: /([+?*]|\{[0-9]+(,[0-9]+)?\})/})
const And = createToken({ name: "And", pattern: /,/})
const Or = createToken({ name: "Or", pattern: /\|/})
const Attribute = createToken({ name: "Attribute", pattern: /([lpfw]|(pf)|(wx)):/})
const Within = createToken({ name: "Within", pattern: /within/})
const Containing = createToken({ name: "Containing", pattern: /containing/})

const allTokens = [
    Space,
    // keywords
    Within,
    Containing,
    Quants,
    Or,
    And,
    Tag,
    // words
    Attribute,
    Word,
    Pos,
    LParen,
    RParen
]

const VoiceLexer = new Lexer(allTokens)

allTokens.forEach((tokenType) => {
    tokenVocabulary[tokenType.name] = tokenType
  })

class VoiceLexingError extends Error {
    constructor(errors) {
        super()
        this.errors = errors
    }
}

module.exports = {
    tokenVocabulary: tokenVocabulary,

    VoiceLexingError: VoiceLexingError,
  
    lex: function (inputText) {
      const lexingResult = VoiceLexer.tokenize(inputText)

      if (lexingResult.errors.length > 0) {
         throw new VoiceLexingError(lexingResult.errors)
      }
  
      return lexingResult
    }
  }