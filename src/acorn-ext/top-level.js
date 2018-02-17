import GenericArray from "../generic/array.js"

import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import { types as tt } from "../acorn/src/tokentype.js"

function enable(parser) {
  parser.parseTopLevel = parseTopLevel
  return parser
}

function parseTopLevel(node) {
  if (! node.body) {
    node.body = []
  }

  const { body } = node
  const exported = { __proto__: null }
  const idents = []
  const top = { __proto__: null }

  let hoistedPrefixString = ""
  let inited = false
  let insertCharIndex = node.start
  let insertNodeIndex = 0

  while (this.type !== tt.eof) {
    const stmt = this.parseStatement(true, true, exported)
    let { expression, id, type } = stmt

    if (! inited) {
      // Avoid hoisting above string literal expression statements such as
      // "use strict", which may depend on occurring at the beginning of
      // their enclosing scopes.
      if (type === "ExpressionStatement" &&
          expression.type === "Literal" &&
          typeof expression.value === "string") {
        insertCharIndex = stmt.end
        insertNodeIndex = body.length + 1
        hoistedPrefixString = ";"
      } else {
        inited = true
      }
    }

    let object = stmt

    if (type === "ExportNameDeclaration") {
      object = stmt.declaration
      type = object.type
    }

    const { push } = GenericArray

    if (type === "VariableDeclaration") {
      for (const decl of object.declarations) {
        const names = getNamesFromPattern(decl.id)

        for (const name of names) {
          push(idents, name)
        }
      }
    } else if (id &&
        (type === "ClassDeclaration" ||
         type === "FunctionDeclaration")) {
      push(idents, id.name)
    } else if (type === "ImportDeclaration") {
      for (const specifier of stmt.specifiers) {
        push(idents, specifier.local.name)
      }
    }

    push(body, stmt)
  }

  top.idents = idents
  top.insertCharIndex = insertCharIndex
  top.insertNodeIndex = insertNodeIndex
  top.hoistedExports = []
  top.hoistedExportsString = ""
  top.hoistedImportsString = ""
  top.hoistedPrefixString = hoistedPrefixString

  this.next()
  node.sourceType = this.options.sourceType
  node.top = top
  return this.finishNode(node, "Program")
}

export { enable }
