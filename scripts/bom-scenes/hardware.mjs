/**
 * Isolated BOM hardware, generated in native Three geometry.
 * The shape, thread pitch and display proportions below are illustrative:
 * only the BOM supplies the confirmed M3 / M6 designation. These objects are
 * product illustrations, not procurement drawings or printable CAD assets.
 */
export const ids = ["through-rod", "short-screw", "m6-nut", "frame-l-bracket", "extrusion-bolt", "t-slot-nut"];

export async function buildPart(THREE, id) {
  if (!ids.includes(id)) throw new Error(`Unsupported hardware part: ${id}`);
  const object = new THREE.Group();
  object.name = `bom-illustration-${id}`;
  const silver = new THREE.MeshStandardMaterial({ color: 0xb7bec8, metalness: 0.86, roughness: 0.28 });
  const satin = new THREE.MeshStandardMaterial({ color: 0xc9ced5, metalness: 0.8, roughness: 0.39 });
  const crest = new THREE.MeshStandardMaterial({ color: 0xd2d7de, metalness: 0.86, roughness: 0.27 });
  const recess = new THREE.MeshStandardMaterial({ color: 0x697581, metalness: 0.76, roughness: 0.4 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x67717e, metalness: 0.82, roughness: 0.32 });
  const brass = new THREE.MeshStandardMaterial({color: 0xb18b3e, metalness: .88, roughness: .3});
  const brassCrest = new THREE.MeshStandardMaterial({color: 0xc29d50, metalness: .9, roughness: .26});
  const brassRecess = new THREE.MeshStandardMaterial({color: 0x7b602c, metalness: .8, roughness: .43});

  const mesh = (geometry, material, parent = object) => {
    const result = new THREE.Mesh(geometry, material);
    result.castShadow = true;
    result.receiveShadow = true;
    parent.add(result);
    return result;
  };
  const circle = (radius, clockwise = false) => {
    const path = new THREE.Path();
    path.absarc(0, 0, radius, 0, Math.PI * 2, clockwise);
    return path;
  };
  const roundedPath = (width, height, radius, Shape = THREE.Shape) => {
    const path = new Shape();
    const w = width / 2, h = height / 2, r = Math.min(radius, w, h);
    path.moveTo(-w + r, -h);
    path.lineTo(w - r, -h);
    path.quadraticCurveTo(w, -h, w, -h + r);
    path.lineTo(w, h - r);
    path.quadraticCurveTo(w, h, w - r, h);
    path.lineTo(-w + r, h);
    path.quadraticCurveTo(-w, h, -w, h - r);
    path.lineTo(-w, -h + r);
    path.quadraticCurveTo(-w, -h, -w + r, -h);
    return path;
  };
  const translatedHole = (path, x, y) => {
    // Transform the sampled boundary so the through openings survive beveling.
    const translated = new THREE.Path();
    const points = path.getPoints(48);
    points.forEach((point, index) => index ? translated.lineTo(point.x + x, point.y + y) : translated.moveTo(point.x + x, point.y + y));
    translated.closePath();
    return translated;
  };
  const extruded = (shape, thickness, bevel = 0.25) => new THREE.ExtrudeGeometry(shape, {
    depth: thickness, bevelEnabled: true, bevelSegments: 3,
    bevelSize: bevel, bevelThickness: bevel, curveSegments: 40, steps: 1,
  });
  const onY = (shape, thickness, material, parent = object, bevel = 0.25) => {
    const geometry = extruded(shape, thickness, bevel);
    geometry.rotateX(-Math.PI / 2);
    return mesh(geometry, material, parent);
  };
  const hexagon = (radius) => {
    const shape = new THREE.Shape();
    for (let i = 0; i <= 6; i++) {
      const angle = i * Math.PI / 3;
      const x = radius * Math.cos(angle), y = radius * Math.sin(angle);
      i ? shape.lineTo(x, y) : shape.moveTo(x, y);
    }
    return shape;
  };
  const thread = (radius, yStart, yEnd, pitch, material, parent, tubeRadius = 0.12) => {
    const turns = (yEnd - yStart) / pitch;
    class Helix extends THREE.Curve {
      getPoint(t, target = new THREE.Vector3()) {
        const a = t * turns * Math.PI * 2;
        return target.set(radius * Math.cos(a), yStart + t * (yEnd - yStart), radius * Math.sin(a));
      }
    }
    const segments = Math.max(48, Math.ceil(turns * 18));
    return mesh(new THREE.TubeGeometry(new Helix(), segments, tubeRadius, 5, false), material, parent);
  };
  const chamferedCylinder = (radius, bottom, top, chamfer, material, parent) => {
    const points = [
      new THREE.Vector2(0, bottom), new THREE.Vector2(radius - chamfer, bottom),
      new THREE.Vector2(radius, bottom + chamfer), new THREE.Vector2(radius, top - chamfer),
      new THREE.Vector2(radius - chamfer, top), new THREE.Vector2(0, top),
    ];
    return mesh(new THREE.LatheGeometry(points, 48), material, parent);
  };
  const socketScrew = (shaftRadius, length, headRadius, headHeight, pitch, material = silver, threadMaterial = crest, socketMaterial = recess) => {
    const screw = new THREE.Group();
    const headShape = new THREE.Shape();
    headShape.absarc(0, 0, headRadius, 0, Math.PI * 2);
    const socketRadius = headRadius * 0.43;
    const socket = hexagon(socketRadius);
    headShape.holes.push(new THREE.Path(socket.getPoints()));
    onY(headShape, headHeight, material, screw, 0.18);
    // The socket is a recess rather than a through-hole: its dark floor lies
    // below the head top and remains visible through the real hex opening.
    onY(hexagon(socketRadius), 0.12, socketMaterial, screw, 0.01).position.y = headHeight * 0.43;
    chamferedCylinder(shaftRadius - 0.09, -length, 0.2, 0.18, material, screw);
    thread(shaftRadius, -length + 0.35, -0.35, pitch, threadMaterial, screw, 0.11);
    screw.rotation.z = -Math.PI / 2 + 0.14;
    screw.rotation.x = 0.1;
    return screw;
  };

  if (id === "through-rod") {
    const rod = new THREE.Group();
    chamferedCylinder(2.3, -48, 48, 0.35, brass, rod);
    thread(2.31, -47.5, 47.5, 1.4, brassCrest, rod, 0.14);
    rod.rotation.z = -Math.PI / 2 + 0.16;
    rod.rotation.x = 0.08;
    object.add(rod);
  } else if (id === "short-screw") {
    object.add(socketScrew(1.8, 19, 3.5, 3.2, 0.82, brass, brassCrest, brassRecess));
  } else if (id === "extrusion-bolt") {
    object.add(socketScrew(2.6, 20, 4.8, 4.6, 1.08));
  } else if (id === "m6-nut") {
    const body = hexagon(6.3);
    body.holes.push(circle(3.12));
    onY(body, 4.5, brass, object, 0.38);
    thread(3.0, 0.28, 4.2, 0.85, brassRecess, object, 0.115);
    object.rotation.y = Math.PI / 12;
  } else if (id === "t-slot-nut") {
    // European T-slot nut silhouette supplied by the user: an elongated,
    // rounded body, raised central threaded boss and serrated end shoulders.
    // All values are display proportions, not a confirmed slot / thread size.
    const polished = new THREE.MeshStandardMaterial({
      color: 0xc8cdd3, metalness: 0.95, roughness: 0.21,
    });
    const foot = roundedPath(28, 16, 7.5);
    foot.holes.push(circle(3.28));
    onY(foot, 3.4, polished, object, 0.35);
    const boss = roundedPath(13.4, 15.2, 4);
    boss.holes.push(circle(3.28));
    // Overlap the two solids inside the shoulder so the boss reads as one
    // machined part rather than a separate floating rectangular neck.
    onY(boss, 3.0, polished, object, 0.45).position.y = 3.15;

    // Each end pad has actual shallow longitudinal serrations. Their ends
    // follow the capsule boundary and taper down into the shoulder; no dark
    // painted stripes or rectangular ribs extend past the rounded body.
    for (const side of [-1, 1]) {
      for (let tooth = -4; tooth <= 4; tooth++) {
        const z = tooth * 1.35;
        const halfWidth = 0.39;
        const xInner = 6.95;
        const xOuter = 6.5 + Math.sqrt(7.5 ** 2 - (Math.abs(z) + halfWidth) ** 2) - 0.2;
        const yRoot = 3.72;
        const yCrest = 4.1;
        const taper = Math.min(0.45, (xOuter - xInner) / 3);
        const ridgeVertices = new Float32Array([
          side * xInner, yRoot, z - halfWidth,
          side * xInner, yRoot, z + halfWidth,
          side * xOuter, yRoot, z - halfWidth,
          side * xOuter, yRoot, z + halfWidth,
          side * (xInner + taper), yCrest, z,
          side * (xOuter - taper), yCrest, z,
        ]);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(ridgeVertices, 3));
        const indices = [0, 2, 5, 0, 5, 4, 1, 4, 5, 1, 5, 3, 0, 4, 1, 2, 3, 5, 0, 1, 3, 0, 3, 2];
        // Mirroring an end reverses winding; preserve outward normals.
        if (side === 1) {
          for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
        }
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        mesh(geometry, polished);
      }
    }
    // The continuous bore passes through both solids. Helical crests project
    // into that opening and remain the same metal finish as the parent body.
    const internalThread = new THREE.MeshStandardMaterial({
      color: 0xd3d9df, metalness: 0.89, roughness: 0.32,
    });
    // Extrusion beveling reduces the straight bore-wall radius to about 2.83
    // in the boss and 2.93 in the base. The helical crest crosses both walls
    // and projects into the opening instead of being buried inside the body.
    thread(2.9, 0.3, 6.18, 1.05, internalThread, object, 0.28);
    object.rotation.y = -0.18;
  } else if (id === "frame-l-bracket") {
    const foot = roundedPath(40, 36, 1.8);
    for (const x of [-11, 11]) foot.holes.push(translatedHole(roundedPath(6.5, 13, 3.25, THREE.Path), x, -1));
    onY(foot, 3, satin, object, 0.32);
    const upright = roundedPath(40, 36, 1.8);
    for (const x of [-11, 11]) upright.holes.push(translatedHole(roundedPath(6.5, 13, 3.25, THREE.Path), x, 1));
    const back = mesh(extruded(upright, 3, 0.32), satin);
    back.position.set(0, 20.9, -16.45);
    // Small edge gussets make the angle understandable without covering holes.
    const gusset = new THREE.Shape();
    gusset.moveTo(-13.4, 3.2);
    gusset.lineTo(7.5, 3.2);
    gusset.lineTo(-13.4, 24.1);
    gusset.closePath();
    const relief = new THREE.Path();
    relief.moveTo(-10, 6.6);
    relief.lineTo(-10, 16.7);
    relief.lineTo(0.1, 6.6);
    relief.closePath();
    gusset.holes.push(relief);
    for (const x of [-16.4, 18.4]) {
      const rib = mesh(extruded(gusset, 2, 0.22), satin);
      // The XY triangular section becomes ZY and extrudes across X.
      rib.rotation.y = -Math.PI / 2;
      rib.position.x = x;
    }
  }

  // Shared renderer uses a world-space y-up floor and fits by world bounds.
  // Centering here prevents small product variants from drifting in cards.
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
  object.updateMatrixWorld(true);
  return {
    object,
    provenance: "schematic",
    note: "Native geometry product illustration. Thread pitch, length, head style, finish and connector proportions are illustrative; consult the BOM for confirmed hardware and the supplied parts for exact fit.",
  };
}
