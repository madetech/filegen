import path from 'path'
import mkdirp from 'mkdirp'
import consolidate from 'consolidate'
import ejs from 'ejs'
import fs from 'fs'
import fileTree from './lib/fileTree'

const TEMPLATE_LIBRARIES = Object.keys(consolidate)

function compileFilepath (root, fpath, context) {
  const relativePath = path.relative(root, fpath)
  const compiledPath = ejs.render(relativePath, context)
  const templateExtension = path.extname(compiledPath).slice(1)

  if (TEMPLATE_LIBRARIES.indexOf(templateExtension) > -1) {
    return compiledPath.slice(0, -(templateExtension.length + 1))
  }

  return compiledPath
}

function readFile (fpath) {
  return new Promise(function (accept, reject) {
    fs.readFile(fpath, function (err, body) {
      if (err) reject(err)
      accept(body.toString())
    })
  })
}

function render (templatePath, context) {
  const templateExtension = path.extname(templatePath).slice(1)
  const libraryIdx = TEMPLATE_LIBRARIES.indexOf(templateExtension)

  if (libraryIdx === -1) return readFile(templatePath)
  return consolidate[templateExtension](templatePath, context)
}

function buildConsolidatedFile (templateRoot, templatePath, context) {
  return render(templatePath, context).then(html => ({
    relativePath: compileFilepath(templateRoot, templatePath, context),
    content: html
  }))
}

function consolidateAllFiles (templateRoot, context) {
  return fileTree(templateRoot)
    .then(templatePaths => Promise.all(templatePaths.map(templatePath =>
      buildConsolidatedFile(templateRoot, templatePath, context)
    )))
}

function saveConsolidatedFile ({ relativePath, content }, destination) {
  return new Promise(function (accept, reject) {
    const generatedFilePath = path.join(destination, relativePath)
    const generatedDirPath = path.dirname(generatedFilePath)

    mkdirp(generatedDirPath, function (err) {
      if (err) reject(err)
      fs.writeFile(generatedFilePath, content, function (fserr) {
        if (fserr) reject(fserr)
        accept(generatedFilePath)
      })
    })
  })
}

export default function filegen ({ templatesDir, cwd }, generators = {}) {
  return function generate (name, options) {
    const templateRoot = path.join(templatesDir, name)
    const generator = generators[name] || (opts => opts)
    const context = generator(options)

    return consolidateAllFiles(templateRoot, context).then(consolidatedFiles => Promise.all(
      consolidatedFiles.map(consolidatedFile => saveConsolidatedFile(consolidatedFile, cwd))
    ))
  }
}
