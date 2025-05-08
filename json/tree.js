import * as THREE from 'three';

// Function to create Three.js objects from JSON
function createObjectFromJSON(json) {
  if (json.type === 'Group') {
    const group = new THREE.Group();
    group.name = json.name;
    group.position.set(...json.position);
    group.rotation.set(...json.rotation);
    group.scale.set(...json.scale);
    if (json.children) {
      json.children.forEach(child => {
        group.add(createObjectFromJSON(child));
      });
    }
    return group;
  } else if (json.type === 'Mesh') {
    const geometry = createGeometry(json.geometry);
    const material = createMaterial(json.material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = json.name;
    mesh.position.set(...json.position);
    mesh.rotation.set(...json.rotation);
    mesh.scale.set(...json.scale);
    if (json.children) {
      json.children.forEach(child => {
        mesh.add(createObjectFromJSON(child));
      });
    }
    return mesh;
  }
}

function createGeometry(geoJson) {
  if (geoJson.type === 'CylinderGeometry') {
    const { radiusTop, radiusBottom, height, radialSegments } = geoJson.parameters;
    return new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
  } else if (geoJson.type === 'SphereGeometry') {
    const { radius, widthSegments, heightSegments } = geoJson.parameters;
    return new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  }
}

function createMaterial(matJson) {
  if (matJson.type === 'MeshStandardMaterial') {
    return new THREE.MeshStandardMaterial({
      color: matJson.color,
      roughness: matJson.roughness,
      metalness: matJson.metalness
    });
  }
}

// Load JSON and add to scene
const treeJson = /* your JSON here */;
const tree = createObjectFromJSON(treeJson);
scene.add(tree);