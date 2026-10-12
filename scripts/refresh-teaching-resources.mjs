import fs from 'node:fs';
import path from 'node:path';
import { buildTeachingResources, updateConfirmedHardwareMetadata } from './teaching-resource-catalog.mjs';

// Refresh publication downloads and metadata without rebuilding CAD meshes or
// changing the magnetic model. The participant's original source stays intact.
const project = path.resolve(import.meta.dirname, '..');
const argv = Object.fromEntries(process.argv.slice(2).map(arg => { const [key, ...rest] = arg.split('='); return [key.replace(/^--/, ''), rest.join('=')]; }));
const source = path.resolve(argv.source || 'G:/OneDrive/桌面/MRI/new_generation_prototype');
const matlabDirectory = path.resolve(argv.matlab || path.join(project, 'matlab'));
const manifestFile = path.join(project, 'lib/cad-manifest.json');
const manifest = updateConfirmedHardwareMetadata(JSON.parse(fs.readFileSync(manifestFile, 'utf8')));
const preservePublishedCAD = !Object.hasOwn(argv, 'update-cad-references');
manifest.resources = buildTeachingResources({ project, source, matlabDirectory, preservePublishedCAD });
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(project, 'lib/teaching-resources.json'), JSON.stringify(manifest.resources, null, 2) + '\n');
fs.writeFileSync(path.join(project, 'public/assembly/manifest.json'), JSON.stringify(manifest) + '\n');
console.log(JSON.stringify({ status: 'updated', resources: manifest.resources.length, printVersions: manifest.resources.filter(r => /^print-prototype-/.test(r.id)).map(r => r.id), matlabFiles: manifest.resources.filter(r => r.type === 'MATLAB').length, publishedCADPreserved: preservePublishedCAD, sourceMATLABModified: false, magneticModelModified: false }));
