const { toCQL } = require("./voice-to-cql")

test('simple phrase "just a test"', () => {
    expect(toCQL("just a test")).toBe('[word="just"] [word="_.*"]* [word="a"] [word="_.*"]* [word="test"]')
})

test('ʔā ʕomplēx ūnīcoḏ̣e ēxāṃpḷē', () => {
    expect(toCQL("ʔā ʕomplēx ūnīcoḏ̣e ēxāṃpḷē")).toBe('[word="ʔā"] [word="_.*"]* [word="ʕomplēx"] [word="_.*"]* [word="ūnīcoḏ̣e"] [word="_.*"]* [word="ēxāṃpḷē"]')
})

test('explicit word test "w:i w:am"', () => {
    expect(toCQL("w:i w:am")).toBe('[word="i"] [word="_.*"]* [word="am"]')
})

test('lemma test "l:be l:not"', () => {
    expect(toCQL("l:be l:not")).toBe('[l="be"] [word="_.*"]* [l="not"]')
})

test('undocumented attribtute test "wx:i wx:am"', () => {
    expect(toCQL("wx:i wx:am")).toBe('[wx="i"] [word="_.*"]* [wx="am"]')
})

test('wildcard * test house, houses, household, housewife ... "a house.*"', () => {
    expect(toCQL("a house.*")).toBe('[word="a"] [word="_.*"]* [word="house.*"]')
})

test('wildcard + test houses, household, housewife ... "a house.+"', () => {
    expect(toCQL("a house.+")).toBe('[word="a"] [word="_.*"]* [word="house.+"]')
})

test('wildcard ? test house, houses "a house.?"', () => {
    expect(toCQL("a house.?")).toBe('[word="a"] [word="_.*"]* [word="house.?"]')
})

test('wildcard ? test house, houses ".?? house .??"', () => {
    expect(toCQL(".?? house .??")).toBe('([word=".?" & word != "_.*"][word="_.*"]*)? [word="_.*"]* [word="house"] [word="_.*"]* ([word=".?" & word != "_.*"][word="_.*"]*)?')
})

test('wildcard first ".+some"', () => {
    expect(toCQL(".+some")).toBe('[word=".+some" & word != "_.*"]')
})

test('wildcard middle "ha.+me"', () => {
    expect(toCQL("ha.+me")).toBe('[word="ha.+me"]')
})

test('wildcard middle single "n.t"', () => {
    expect(toCQL("n.t")).toBe('[word="n.t"]')
})

test('wildcard two letters ".."', () => {
    expect(toCQL("..")).toBe('[word=".." & word != "_.*"]')
})

test('wildcard two letters pos "p:.."', () => {
    expect(toCQL("p:..")).toBe('[p=".."]')
})

test('character class "o_[a-z]+"', () => {
    expect(toCQL("o_[a-z]+")).toBe('[word="o_[a-z]+"]')
})

test('character class "o_\\w+"', () => {
    expect(toCQL("o_\\w+")).toBe('[word="o_\\w+"]')
})

test('exclude character class "o_[^t]+"', () => {
    expect(toCQL("o_[^t]+")).toBe('[word="o_[^t]+"]')
})

test('character class "o_\\w{1,1}"', () => {
    expect(toCQL("o_\\w+")).toBe('[word="o_\\w+"]')
})

test('character class in pos "VV[A-Z]?"', () => {
    expect(toCQL("VV[A-Z]?")).toBe('[pf="VV[A-Z]?"]')
})

test('character class in pos "VV\\w?"', () => {
    expect(toCQL("VV\\w?")).toBe('[pf="VV\\w?"]')
})

test('exclude character class in pos "VV[^P]?"', () => {
    expect(toCQL("VV[^P]?")).toBe('[pf="VV[^P]?"]')
})

test('character class in pos "VV\\w{1,1}"', () => {
    expect(toCQL("VV\\w{1,1}")).toBe('[pf="VV\\w{1,1}"]')
})

test('pos test "only p:NN"', () => {
    expect(toCQL("only p:NN")).toBe('[word="only"] [word="_.*"]* [p="NN"]')
})

test('pos test "only NN"', () => {
    expect(toCQL("only NN")).toBe('[word="only"] [word="_.*"]* [pf="NN"]')
})

test('"within the p:NN"', () => {
    expect(toCQL("within the p:NN")).toBe('[word="within"] [word="_.*"]* [word="the"] [word="_.*"]* [p="NN"]')
})

test('"(der|die|das) within <LNger/>"', () => {
    expect(toCQL("(der|die|das) within <LNger/>")).toBe('[word="(der|die|das)"] within <LNger/>')
})

test('space in tag "potential within <reading aloud/>"', () => {
    expect(toCQL("potential within <reading aloud/>")).toBe('[word="potential"] within <reading_aloud/>')
})

test('space in tag "you containing <c type="lengthening"/>"', () => {
    expect(toCQL('you containing <c type="lengthening"/>')).toBe('(([word="you"] [word="_.*"]* <c type="lengthening"> [word="_.*"]) | ([word="you"] [word="_.*"]* within <c type="lengthening"/>))')
})

test('"the moment within <@/>"', () => {
    expect(toCQL("the moment within <@/>")).toBe('[word="the"] [word="_.*"]* [word="moment"] within <laughingly/>')
})

test('"containing"', () => {
    expect(toCQL("containing")).toBe('[word="containing"]')
})

test('"<LNger/> containing (der|die|das)"', () => {
    expect(toCQL("<LNger/> containing (der|die|das)")).toBe('<LNger/> containing [word="(der|die|das)"]')
})

test('token containing tag "extremely containing <emph/>"', () => {
    expect(toCQL("extremely containing <emph/>")).toBe('(([word="extremely"] [word="_.*"]* <emph> [word="_.*"]) | ([word="extremely"] [word="_.*"]* within <emph/>))')
})

test('token containing tag "RB containing <emph/>"', () => {
    expect(toCQL("RB containing <emph/>")).toBe('(([pf="RB"] [word="_.*"]* <emph> [word="_.*"]) | ([pf="RB"] [word="_.*"]* within <emph/>))')
})

test('token containing tag "l:know containing <emph/>"', () => {
    expect(toCQL("l:know containing <emph/>")).toBe('(([l="know"] [word="_.*"]* <emph> [word="_.*"]) | ([l="know"] [word="_.*"]* within <emph/>))')
})

test('combine word and attribute "get,p:VVP"', () => {
    expect(toCQL("get,p:VVP")).toBe('[word="get" & p="VVP"]')
})

test('combine word and attribute "VVP,get"', () => {
    expect(toCQL("VVP,get")).toBe('[word="get" & pf="VVP"]')
})

test('combine word and attribute "l:get,p:VVP"', () => {
    expect(toCQL("l:get,p:VVP")).toBe('[l="get" & p="VVP"]')
})

test('combine word and attribute "austrian,N.*"', () => {
    expect(toCQL("austrian,N.*")).toBe('[word="austrian" & pf="N.*"]')
})

test('combine word and attribute "austrian,p:N.*"', () => {
    expect(toCQL("austrian,p:N.*")).toBe('[word="austrian" & p="N.*"]')
})

test('combine word and attribute "VV,go"', () => {
    expect(toCQL("VV,go")).toBe('[word="go" & pf="VV"]')
})

test('combine word and attribute "VV,l:go"', () => {
    expect(toCQL("VV,l:go")).toBe('[l="go" & pf="VV"]')
})

test('one attribute or the other "p:N.* | f:N.*"', () => {
    expect(toCQL("p:N.* | f:N.*")).toBe('[p="N.*"] | [f="N.*"]')
})

test('one attribute or the other "p:N.*|f:N.*"', () => {
    expect(toCQL("p:N.*|f:N.*")).toBe('[p="N.*" | f="N.*"]')
})

test('one attribute or the other "l:man|l:house"', () => {
    expect(toCQL("l:man|l:house")).toBe('[l="man" | l="house"]')
})

test('one attribute or the other "l:man|pf:NN"', () => {
    expect(toCQL("l:man|pf:NN")).toBe('[l="man" | pf="NN"]')
})

test('one attribute or the other "RE|UH i"', () =>{
    expect(toCQL("RE|UH i")).toBe('[pf="RE|UH"] [word="_.*"]* [word="i"]')
})

test('one attribute or the other (precedence!) "RE | UH i"', () =>{
    expect(toCQL("RE | UH i")).toBe('[pf="RE"] | [pf="UH"] [word="_.*"]* [word="i"]')
})

test('one word or the other (precedence!) "never | always say"', () => {
    expect(toCQL("never | always say")).toBe('[word="never"] | [word="always"] [word="_.*"]* [word="say"]')
})

test('pause 1 "_1"', () => {
    expect(toCQL("_1")).toBe('[word="_1"]')
})

test('parentheses quants "(de|a)?part(ment)?"', () => {
    expect(toCQL("(de|a)?part(ment)?")).toBe('[word="(de|a)?part(ment)?"]')
})

test('parentheses quants "a (JJ)? thing"', () => {
    expect(toCQL("a (JJ)? thing")).toBe('[word="a"] [word="_.*"]* [pf="(JJ)?"] [word="_.*"]* [word="thing"]')
})

test('token quants "a (JJ)?? thing"', () => {
    expect(toCQL("a (JJ)?? thing")).toBe('[word="a"] [word="_.*"]* ([pf="(JJ)?"][word="_.*"]*)? [word="_.*"]* [word="thing"]')
})

test('parentheses quants "a (JJ){1,2} thing"', () => {
    expect(toCQL("a (JJ){1,2} thing")).toBe('[word="a"] [word="_.*"]* [pf="(JJ){1,2}"] [word="_.*"]* [word="thing"]')
})

test('token quants "a ( JJ ){1,2} thing"', () => {
    expect(toCQL("a ( JJ ){1,2} thing")).toBe('[word="a"] [word="_.*"]* ( [pf="JJ"] [word="_.*"]* ){1,2} [word="thing"]')
})

test('token quants "a JJ.+? thing"', () => {
    expect(toCQL("a JJ.+? thing")).toBe('[word="a"] [word="_.*"]* ([pf="JJ.+"][word="_.*"]*)? [word="_.*"]* [word="thing"]')
})

test('token quants "a JJ.{0,3}{1,2} thing"', () => {
    expect(toCQL("a JJ.{0,3}{1,2} thing")).toBe('[word="a"] [word="_.*"]* ([pf="JJ.{0,3}"][word="_.*"]*){1,2} [word="_.*"]* [word="thing"]')
})

test('token quants "x{0,3}x"', () => {
    expect(toCQL("x{0,3}x")).toBe('[word="x{0,3}x"]')
})

test('token quants "a JJ.++ thing"', () => {
    expect(toCQL("a JJ.++ thing")).toBe('[word="a"] [word="_.*"]* ([pf="JJ.+"][word="_.*"]*)+ [word="_.*"]* [word="thing"]')
})

test('token quants "a * thing"', () => {
    expect(toCQL("a * thing")).toBe('[word="a"] [word="_.*"]* [word="[^_]*"]? [word="_.*"]* [word="thing"]')
})

test('token quants "a ? thing"', () => {
    expect(toCQL("a ? thing")).toBe('[word="a"] [word="_.*"]* [word="[^_]?"]? [word="_.*"]* [word="thing"]')
})

test('token quants "a + thing"', () => {
    expect(toCQL("a + thing")).toBe('[word="a"] [word="_.*"]* [word="[^_]+"] [word="_.*"]* [word="thing"]')
})

test('token quants "a {2} thing"', () => {
    expect(toCQL("a {2} thing")).toBe('[word="a"] [word="_.*"]* ([word="[^_]*"][word="_.*"]*){2} [word="_.*"]* [word="thing"]')
})

test('token quants "a {2,3} thing"', () => {
    expect(toCQL("a {2,3} thing")).toBe('[word="a"] [word="_.*"]* ([word="[^_]*"][word="_.*"]*){2,3} [word="_.*"]* [word="thing"]')
})

test('lemma and pos "l:under.*,NNS', () => {
    expect(toCQL("l:under.*,NNS")).toBe('[l="under.*" & pf="NNS"]')
})

test('search laughter "_@@"', () => {
    expect(toCQL("_@@")).toBe('[word="_@@"]')
})

test('search laughter "_@ _@"', () => {
    expect(toCQL("_@ _@")).toBe('[word="_@"] [word="_.*" & word!="_@"]* [word="_@"]')
})

test('tags alone "<LNger> a.*"', () => {
    expect(toCQL("<LNger> a.*")).toBe('<LNger> [word="_.*"]* [word="a.*" & word != ".*_"]')
})

test('tags alone "<fast> need to go"',() =>{
    expect(toCQL("<fast> need to go")).toBe('<fast> [word="_.*"]* [word="need"] [word="_.*"]* [word="to"] [word="_.*"]* [word="go"]')
})

test('parentheses or within a word "(a|the)"', () => {
    expect(toCQL("(a|the)")).toBe('[word="(a|the)"]')
})

test('leading space " .* house"', () => {
    expect(toCQL(" .* house")).toBe('[word=".*" & word != "_.*" & word != ".*_"] [word="_.*"]* [word="house"]')
})

test('leading space " * house"', () => {
    expect(toCQL(" * house")).toBe('[word="[^_]*"]? [word="_.*"]* [word="house"]')
})

test('trailing space ".* house "', () => {
    expect(toCQL(".* house ")).toBe('[word=".*" & word != "_.*" & word != ".*_"] [word="_.*"]* [word="house"]')
})

test('trailing space " * house"', () => {
    expect(toCQL("* house ")).toBe('[word="[^_]*"]? [word="_.*"]* [word="house"]')
})

test('trailing space " * \'.*"', () => {
    expect(toCQL("* \'.*")).toBe('[word="[^_]*"]? [word="_.*"]* [word="\'.*" & word != ".*_"]')
})

test('parentheses or as token alone "( a | the )"', () => {
    expect(toCQL("( a | the )")).toBe('( [word="a"] | [word="the"] ) ')
})

test('wrong input "$$$"', () => {
    expect(() => { toCQL("$$$") }).toThrowError('unexpected character: ->$<- at offset: 0, skipped 3 characters.')
})

test('wrong input "a {2,} thing"', () => {
    expect(() => { toCQL("a {2,} thing") }).toThrowError('unexpected character: ->{<- at offset: 2, skipped 1 characters.')
})

test('wrong input "[word="cql"]"', () => {
    expect(() => { toCQL("[word=\"cql\"]") }).toThrowError('unexpected character: ->=<- at offset: 5, skipped 2 characters.')
})

test('wrong input "<tag> [word="cql"]"', () => {
    expect(() => { toCQL("<tag> [word=\"cql\"]") }).toThrowError('unexpected character: ->=<- at offset: 11, skipped 2 characters.')
})

test('wrong input "<tag> "cql""', () => {
    expect(() => { toCQL("<tag> \"cql\"") }).toThrowError('unexpected character: ->"<- at offset: 6, skipped 1 characters.')
})