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

  normalized() {
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

  to_discrete() {
    return {
      r: this.r * 255,
      g: this.g * 255,
      b: this.b * 255
    };
  }
}

class Ray {
  constructor(origin, direction) {
    this.origin = origin;
    this.direction = direction;
  }
}

class Sphere {
  constructor(center, radius, color) {
    this.center = center;
    this.radius = radius;
    this.color = color;
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

    return t;
  }
}

let random_color = () => {
  return new Color(
    Math.random() * 0.5 + 0.5,
    Math.random() * 0.5 + 0.5,
    Math.random() * 0.5 + 0.5
  );
};

let random_radius = () => {
  let max = 30;
  let min = 5;

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

// let old_spheres = [
//   new Sphere(new Vector(10, 13, 100), 25, new Color(0.9, 0.2, 0.4)),
//   new Sphere(new Vector(30, -5, 70), 15, new Color(0.4, 0.9, 0.5)),
//   new Sphere(new Vector(-30, -20, 80), 20, random_color())
// ];

const geometry = [];

for (let sp = 0; sp < 100; sp++) {
  geometry.push(new Sphere(random_position(), random_radius(), random_color()))
}

const scene = {
  imagePlane: {
    x1: new Vector(1, 0.75, 0),
    x2: new Vector(-1, 0.75, 0),
    x3: new Vector(1, -0.75, 0),
    x4: new Vector(-1, -0.75, 0)
  },
  cameraOrigin: new Vector(0, 0, -1),
  geometry
};

const image = new Image(WIDTH, HEIGHT);
document.image = image;

const trace = ray => {
  const closest = {
    distance: Infinity,
    color: new Color(0, 0, 0)
  };

  for (object of scene.geometry) {
    const distance = object.intersect(ray);

    if ((distance > 0 || distance === 0) && distance < closest.distance) {
      closest.distance = distance;
      closest.color = object.color;
    }
  }

  return closest.color;
}

const sample_pixel = (x, y) => {
  const alpha = x / WIDTH;
  const beta = y / HEIGHT;

  // bilinear interpolation to get point on image plane
  const t = Vector.lerp(scene.imagePlane.x1, scene.imagePlane.x2, alpha);
  const b = Vector.lerp(scene.imagePlane.x3, scene.imagePlane.x4, alpha);
  const p = Vector.lerp(t, b, beta);

  const direction = p.subtract(scene.cameraOrigin);

  const ray = new Ray(p, direction);

  return trace(ray);
};

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
