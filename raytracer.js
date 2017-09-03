const WIDTH = 256;
const HEIGHT = 192;

class Vector {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  multiply(v) {
    return new Vector(
      this.x * v,
      this.y * v,
      this.z * v
    );
  }

  add(v) {
    return new Vector(
      this.x + v.x,
      this.y + v.y,
      this.z + v.z
    );
  }

  subtract(v) {
    return new Vector(
      this.x - v.x,
      this.y - v.y,
      this.z - v.z
    );
  }

  dot(v) {
    return this.x * v.x +
           this.y * v.y +
           this.z * v.z;
  }

  magnitude() {
    return Math.sqrt(this.dot(this));
  }

  normalize() {
    return this.multiply(1 / this.magnitude());
  }
}

Vector.lerp = (v1, v2, t) => {
  return v1.multiply(1 - t).add(v2.multiply(t));
};

class Color {
  constructor(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
  }

  multiply(other) {
    return new Color(
      this.r * other.r,
      this.g * other.g,
      this.b * other.b
    );
  }

  scale(s) {
    return new Color(
      this.r * s,
      this.g * s,
      this.b * s
    );
  }

  add(v) {
    return new Color(
      this.r + v.r,
      this.g + v.g,
      this.b + v.b
    );
  }

  at_pxy(x, y) {
    return this;
  }

  to_discrete() {
    return {
      r: this.r * 255,
      g: this.g * 255,
      b: this.b * 255
    };
  }
}

class Texture {
  constructor(image) {
    this.image = image;
  }

  at_pxy(px, py) {
    const x = Math.round(px * (this.image.length - 1));
    const y = Math.round(px * (this.image[0].length - 1));

    //console.log(px, py, x, y);
    window.samples = window.samples || [];
    window.samples.push({x, y});

    return this.image[x][y];
  }
}

class PhongMaterial {
  constructor(diffuse, specular, ambient, shininess) {
    this.diffuse = diffuse;
    this.specular = specular;
    this.ambient = ambient;
    this.shininess = shininess;
  }
}

class PointLight {
  constructor(location, diffuse, specular) {
    this.location = location;
    this.diffuse = diffuse;
    this.specular = specular;
  }
}

Color.WHITE = new Color(1, 1, 1);
Color.BLACK = new Color(0, 0, 0);

class Ray {
  constructor(origin, direction) {
    this.origin = origin;
    this.direction = direction;
  }
}

class Sphere {
  constructor(center, radius, material) {
    this.center = center;
    this.radius = radius;
    this.material = material;
  }

  intersect(ray) {
    const ray_to_center = ray.origin.subtract(this.center);

    // d . d = ||d||^2
    const a = ray.direction.dot(ray.direction);
    const b = ray_to_center.dot(ray.direction) * 2;
    const c = ray_to_center.dot(ray_to_center) - (this.radius * this.radius);

    const discriminant = (b * b) - (4 * a * c);

    if (discriminant < 0)
      return false;

    const plus = (-b + Math.sqrt(discriminant)) / (2 * a);
    const minus = (-b - Math.sqrt(discriminant)) / (2 * a);
    
    let t = plus;

    if (minus >= 0 && minus < t)
      t = minus;

    // TODO: get material, point, and normal after finding closest intersection
    const point = ray.origin.add(ray.direction.normalize().multiply(t)); 
    const normal = point.subtract(this.center).normalize();

    // rename UV
    // for pxy also
    const tex_x = Math.atan2(normal.x, normal.z) / (2 * Math.PI) + 0.5;
    const tex_y = normal.y * 0.5 + 0.5;

    return {
      distance: t,
      point,
      normal,
      ambient: this.material.ambient.at_pxy(tex_x, tex_y),
      diffuse: this.material.diffuse.at_pxy(tex_x, tex_y),
      specular: this.material.specular.at_pxy(tex_x, tex_y),
      shininess: this.material.shininess,
      geo: this
    };
  }
}

class BoundingBox {
  constructor(vmin, vmax, material) {
    this.vmin = vmin;
    this.vmax = vmax;
    this.material = material;
  }

  intersect(ray) {
    let tmin = (this.vmin.x - ray.origin.x) / ray.direction.x;
    let tmax = (this.vmax.x - ray.origin.x) / ray.direction.x;

    if (tmin > tmax) {
      const temp = tmin;
      tmin = tmax;
      tmax = temp;
    }

    let tymin = (this.vmin.y - ray.origin.y) / ray.direction.y;
    let tymax = (this.vmax.y - ray.origin.y) / ray.direction.y;

    if (tymin > tymax) {
      const temp = tymin;
      tymin = tymax;
      tymax = temp;
    }

    if ((tmin > tymax) || (tymin > tmax))
      return false;

    if (tymin > tmin)
      tmin = tymin;

    if (tymax < tmax)
      tmax = tymax;

    const tzmin = (this.vmin.z - ray.origin.z) / ray.direction.z;
    const tzmax = (this.vmax.z - ray.origin.z) / ray.direction.z;

    if (tzmin > tzmax) {
      const temp = tzmin;
      tzmin = tzmax;
      tzmax = temp;
    }

    if ((tmin > tzmax) || (tzmin > tmax))
      return false;

    if (tzmin > tmin)
      tmin = tzmin;

    if (tzmax < tmax)
      tmax = tzmax;

    if (tmin >= 0) {
      //const point = ray.origin.add(ray.direction.normalize().multiply(tmin)); 

      return {
        distance: tmin,
        //point,
        material: this.material,
        geo: this
      };
    }

    return false;
  }
}

class Plane {
  constructor(point, normal) {
    this.point = point;
    this.normal = normal.normalize();
  }

  intersect(ray) {
    // TODO: ???? why???
    const normal = this.normal.multiply(-1);
    const denom = normal.dot(ray.direction.normalize());
    if (denom > 1e-6) {
      const p0l0 = this.point.subtract(ray.origin);
      const t = p0l0.dot(normal) / denom;

      if (t >= 0) {
        const surface = ray.origin.add(ray.direction.normalize().multiply(t));

        const material = default_material((Math.round(surface.x / 10) + Math.round(surface.z / 10)) & 1 ? Color.WHITE : Color.BLACK);

        return {
          distance: t,
          point: surface,
          ambient: material.ambient,
          diffuse: material.diffuse,
          specular: material.specular,
          shininess: material.shininess,
          normal: this.normal,
          geo: this
        };
      }
    }

    return false;
  }
}

class Triangle {
}

const default_material = color =>
  new PhongMaterial(color, new Color(0.5, 0.5, 0.5), color, 50);

const random_color = () => {
  return new Color(
    Math.random() * 0.5 + 0.5,
    Math.random() * 0.5 + 0.5,
    Math.random() * 0.5 + 0.5
  );
};

const random_radius = () => {
  const max = 30;
  const min = 5;

  return (Math.random() * (max - min)) + min;
};

let random_position = () => {
  let min_x = -100;
  let max_x = 100;

  let min_y = -70;
  let max_y = 70;

  let min_z = 500;
  let max_z = 50;

  return new Vector(
    (Math.random() * (max_x - min_x)) + min_x,
    (Math.random() * (max_y - min_y)) + min_y,
    (Math.random() * (max_z - min_z)) + min_z
  );
};

const createScene = () => {
  return loadImg('earth.jpg').then(earth => {
    // let old_spheres = [
    //   new Sphere(new Vector(10, 13, 100), 25, new Color(0.9, 0.2, 0.4)),
    //   new Sphere(new Vector(30, -5, 70), 15, new Color(0.4, 0.9, 0.5)),
    //   new Sphere(new Vector(-30, -20, 80), 20, random_color())
    // ];

    const geometry = [
      //new BoundingBox(new Vector(30, 30, 40), new Vector(10, 10, 60), default_material(new Color(1, 0, 0))),
      new Plane(new Vector(0, -30, 0), new Vector(0, 1, 0)),
      new Sphere(new Vector(0, 0, 50), 20, default_material(new Color(0, 1, 1)))
      //new Sphere(new Vector(0, 0, 50), 20, default_material(new Texture(earth)))
    ];

    for (let sp = 0; sp < 100; sp++) {
      geometry.push(new Sphere(random_position(), random_radius(), default_material(random_color())))
    }

    const scene = {
      imagePlane: {
        x1: new Vector(1, 0.75, 0),
        x2: new Vector(-1, 0.75, 0),
        x3: new Vector(1, -0.75, 0),
        x4: new Vector(-1, -0.75, 0)
      },
      camera_origin: new Vector(0, 0, -1),
      ambient: new Color(0.2, 0.2, 0.2),
      lights: [
        new PointLight(new Vector(30, 30, 20), new Color(0.8, 0.8, 0.8), new Color(0.8, 0.8, 0.8)),
        //new PointLight(new Vector(5, 5, 0), new Color(0.8, 0.8, 0.8), new Color(1, 1, 1))
      ],
      geometry
    };

    return Promise.resolve(scene);
  });
};
const imageDataToPixels = imageData => {
  let image = [];

  for (let x = 0; x < imageData.width; x++) {
    let row = [];
    for (let y = 0; y < imageData.height; y++) {
      const index = (x + (y * imageData.width)) * 4;
      const r = imageData.data[index];
      const g = imageData.data[index + 1];
      const b = imageData.data[index + 2];

      row.push(new Color(r / 255, g / 255, b / 255));
    }
    image.push(row);
  }

  return image;
}

const loadImg = url => {
  const image = new HTMLImage(100, 100);

  return new Promise((resolve, reject) => {
    image.addEventListener('load', function() {
      this.height = this.naturalHeight;
      this.width = this.naturalWidth;

      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;

      const context = canvas.getContext('2d');

      context.drawImage(this, 0, 0, this.width, this.height);

      resolve(imageDataToPixels(context.getImageData(0, 0, this.width, this.height)));
    })

    image.src = url;
  });
};


const closestIntersection = (ray, exclude) => {
  let closest = {
    distance: Infinity
  };

  for (object of scene.geometry) {
    if (object === exclude) continue;

    const intersection = object.intersect(ray);
    const distance = intersection.distance;

    if ((distance > 0 || distance === 0) && distance < closest.distance) {
      closest = intersection;
    }
  }

  return closest;
};

const inShadow = (geo, point, light) => {
  let point_to_light = light.location.subtract(point);
  let shadowRay = new Ray(point, point_to_light);

  let closest = closestIntersection(shadowRay, geo);

  return closest.distance > 0 && closest.distance < point_to_light.magnitude();
};

const trace = ray => {
  let closest = closestIntersection(ray);

  if (!isFinite(closest.distance))
    return Color.BLACK;

  const ambient = closest.ambient.multiply(scene.ambient);

  let diffuse = Color.BLACK;
  let specular = Color.BLACK;

  for (let light of scene.lights) {
    const light_direction = light.location.subtract(closest.point).normalize();
    const alignment = closest.normal.dot(light_direction);

    if (alignment < 0)
      continue;

    if (inShadow(closest.geo, closest.point, light))
      continue;

    const d = closest.diffuse.multiply(light.diffuse).scale(alignment);
    diffuse = diffuse.add(d);

    const reflection = closest.normal.multiply(closest.normal.dot(light_direction) * 2).subtract(light_direction);
    const view = closest.point.subtract(scene.camera_origin).normalize();

    // ???? it works >.>
    const view_alignment = -view.dot(reflection);

    if (view_alignment < 0)
      continue;

    const s = closest.specular.multiply(light.specular).scale(Math.pow(view_alignment, closest.shininess))
    specular = specular.add(s);
  }

  return ambient.add(diffuse).add(specular);
}

const sample_pixel = (x, y) => {
  const alpha = x / WIDTH;
  const beta = y / HEIGHT;

  // bilinear interpolation to get point on image plane
  const t = Vector.lerp(scene.imagePlane.x1, scene.imagePlane.x2, alpha);
  const b = Vector.lerp(scene.imagePlane.x3, scene.imagePlane.x4, alpha);
  const p = Vector.lerp(t, b, beta);

  const direction = p.subtract(scene.camera_origin);

  const ray = new Ray(p, direction);

  return trace(ray);
};

const image = new Image(WIDTH, HEIGHT);
document.image = image;

const render = () => {
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const color = sample_pixel(x, y);
      image.putPixel(x, y, color.to_discrete());

      // image.putPixel(x, y, {
      //   r: x / WIDTH * 256,
      //   g: y / HEIGHT * 256,
      //   b: 0
      // });
    }
  }

  image.renderInto(document.querySelector('body'));
};

createScene()
  .then(s => window.scene = s)
  .then(render);
