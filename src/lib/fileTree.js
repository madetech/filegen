import path from 'path'
import fs from 'fs'

const flatten = (arrays) => arrays.reduce((acc, arr) => acc.concat(arr), [])

export default function fileTree (dir) {
  return new Promise(function (accept, reject) {
    fs.readdir(dir, function (err, names) {
      if (err) reject(err)

      const files = []
      const directories = []

      for (const name of names) {
        const fullPath = path.join(dir, name)
        const stats = fs.statSync(path.join(dir, name))

        if (stats.isFile()) files.push(fullPath)
        if (stats.isDirectory()) directories.push(fullPath)
      }

      Promise.all(directories.map(fileTree))
        .then(dirs => flatten(dirs))
        .then(newFiles => files.concat(newFiles))
        .then(allFiles => accept(allFiles))
    })
  })
}
