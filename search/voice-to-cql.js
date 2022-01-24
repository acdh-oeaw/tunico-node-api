const { parse, parserInstance, VoiceLexingError, VoiceParsingError } = require("./voice-parsing.js")

const BaseVoiceVisitor = parserInstance.getBaseCstVisitorConstructor()

class VoiceToCQL extends BaseVoiceVisitor {
    constructor() {
        super()
        this.validateVisitor()
        this.exceptWordWithUnderscore = ''
      }

    query(ctx) {
        var cql = ""
        const $ = this
        if (ctx.tagContaining) {cql += $.visit(ctx.tagContaining)}
        ctx.token.forEach((token) => {
            const cqlPart = $.visit(token),
                  exceptWordWithUnderscore = this.exceptWordWithUnderscore
            this.exceptWordWithUnderscore = ''
            if (cqlPart && cqlPart.match(/^[&|)]$/)) {return cql = `${this.removeLastUnderscoreIgnore(cql)} ${cqlPart} `}
            if (cqlPart && cqlPart.match(/^(\(|\).+)$/)) {return cql += `${cqlPart} `}
            if (cqlPart) {return cql += cqlPart + ` [word="_.*"${exceptWordWithUnderscore}]* `}
        })
        return this.removeLastUnderscoreIgnore(cql)
    }

    removeLastUnderscoreIgnore(cql) {
        const ret = cql.replace(/^(.*?)( \[word="_\.\*"[^\]]*\]\* ??)( within <[^>]+>)?( \[word="_\.\*".*\]\* )?$/, '$1$3')       
        return ret
    }

    tagContaining(ctx) {
        return this.visit(ctx.tag) + " containing "
    }
    
    token(ctx) {
        const quant = ctx.quants ? this.visit(ctx.quants) : ''
        if (ctx.tag) { return `${this.visit(ctx.tag)}` }
        if (ctx.withinTag) { return `${this.visit(ctx.withinTag)}` }
        if (ctx.containingTag) { return `${this.visit(ctx.containingTag)}` }
        if (ctx.wordAndAttributeValue) { return quant !== '' ? `([${this.visit(ctx.wordAndAttributeValue)}][word="_.*"]*)${quant}` : `[${this.visit(ctx.wordAndAttributeValue)}]`} 
        if (ctx.pos) { return quant !== '' ? `([${this.visit(ctx.pos)}][word="_.*"]*)${quant}` : `[${this.visit(ctx.pos)}]`}
        if (ctx.word) { return quant !== '' ? `([${this.visit(ctx.word)}][word="_.*"]*)${quant}` : `[${this.visit(ctx.word)}]`}
        if (ctx.attributeValue) { return quant !== '' ? `([${this.visit(ctx.attributeValue)}][word="_.*"]*)${quant}` : `[${this.visit(ctx.attributeValue)}]`}
        if (ctx.and) { return this.visit(ctx.and) }
        if (ctx.or_) { return this.visit(ctx.or_) }
        if (ctx.lparen) { return this.visit(ctx.lparen) }
        if (ctx.rparen) { return this.visit(ctx.rparen) }
        if (quant !== '') { switch(quant) {
            case '+': return `[word="[^_]+"]`
            case '*': return `[word="[^_]*"]?`
            case '?': return `[word="[^_]?"]?`
            default: return `([word="[^_]*"][word="_.*"]*)${quant}`
          }
        }
    }

    withinTag(ctx) {
        return "within " + this.visit(ctx.tag)
    }

    containingTag(ctx) {
        const token = ctx.attributeValue ? this.visit(ctx.attributeValue) :
                      ctx.pos ? this.visit(ctx.pos) :
                      ctx.word ? this.visit(ctx.word) : undefined
        const tag = this.visit(ctx.tag).replace('/', '')
        return `(([${token}] [word="_.*"]* ${tag} [word="_.*"]) | ([${token}] [word="_.*"]* within ${tag.replace('>', '/>')}))`
    }
    
    word(ctx) {
        const word = ctx.Word ? ctx.Word[0].image :
                     ctx.Within ? ctx.Within[0].image :
                     ctx.Containing ? ctx.Containing[0].image : undefined
        var exclude_ = (word && word.startsWith('.')) ? ' & word != "_.*"' : ''
        exclude_ += (word && word.match(/^.{1,2}[+*]$/)) ? ' & word != ".*_"' : ''
        this.exceptWordWithUnderscore = word.startsWith('_') ? ` & word!="${word}"`: ''
        return `word="${word}"${exclude_}`
    }

    attributeValue(ctx) {
        const attribute = this.visit(ctx.attribute).replace(":", "=").replace("w=", "word=")
        const value = ctx.word ? ctx.word[0].children.Word[0].image :
                      ctx.pos ? ctx.pos[0].children.Pos[0].image : undefined
        return `${attribute}"${value}"`
    }

    wordAndAttributeValue(ctx) {
        const lhs = ctx.word ? {type: ctx.word.length === 2 ? 'word1' : 'word', v: this.visit(ctx.word)} :
                    ctx.attributeValue ? {type: ctx.attributeValue.length === 2 ? 'attributeValue1' : 'attributeValue', v: this.visit(ctx.attributeValue)} :
                    ctx.pos ? {type: ctx.pos.length === 2 ? 'pos1' : 'pos', v: this.visit(ctx.pos)} : undefined
        const op = ctx.and ? this.visit(ctx.and) :
                   ctx.or_ ? this.visit(ctx.or_) : undefined
        const rhs = ctx.attributeValue && lhs.type === 'attributeValue1' ? this.visit(ctx.attributeValue[1]) :
                    ctx.attributeValue && lhs.type !== 'attributeValue' ? this.visit(ctx.attributeValue) :
                    ctx.pos && lhs.type === 'pos1' ? this.visit(ctx.pos[1]) :
                    ctx.pos && lhs.type !== 'pos' ? this.visit(ctx.pos) :
                    ctx.word && lhs.type === 'word1' ? this.visit(ctx.word[1]) :
                    ctx.word && lhs.type !== 'word' ? this.visit(ctx.word) : undefined
        return `${lhs.v} ${op} ${rhs}`
    }

    attribute(ctx) {
        return ctx.Attribute[0].image
    }

    pos(ctx) {
        const pos = ctx.Pos ? ctx.Pos[0].image : ""
        return `p="${pos}"`
    }

    quants(ctx) {
        return ctx.Quants[0].image
    }

    tag(ctx) {
        return ctx.Tag[0].image.replace(/@/, 'laughingly')
                               .replace(/^(<[^ ]+) (?![^=]+=)(.*)$/, '$1_$2')
    }

    and(ctx) {
        return '&'
    }

    or_(ctx) {
        return '|'
    }

    lparen(ctx) {
        return '('
    }

    rparen(ctx) {
        const quant = ctx.quants ? this.visit(ctx.quants) : ''           
        return `)${quant}`
    }
}

const voiceToCQL = new VoiceToCQL()

module.exports = {
    toCQL: function (inputText) {
    try {
        const cst = parse(inputText)

        const CQL = voiceToCQL.visit(cst)

        return CQL
    } catch (error) {
        if (error instanceof VoiceLexingError) { throw Error(error.errors[0].message) }        
        if (error instanceof VoiceParsingError) { throw Error(error.errors[0].message) }
        throw error
    }
    }
}