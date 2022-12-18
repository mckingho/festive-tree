import { frameThickness, ballRadius } from './dimension.js';

let Bodies = Matter.Bodies;
let Body = Matter.Body;
let Composite = Matter.Composite;
let Constraint = Matter.Constraint;
let Engine = Matter.Engine;
let Render = Matter.Render;
let Runner = Matter.Runner;

let instance;

class MatterObject {
    constructor(renderElement, width, height) {
        if (!instance) {
            // create an engine
            this.engine = Engine.create();

            // create a renderer
            this.render = Render.create({
                element: renderElement,
                engine: this.engine,
                options: {
                    width,
                    height,
                    wireframes: false,
                    background: 'transparent',
                }
            });

            // run the renderer
            Render.run(this.render);

            // create runner
            this.runner = Runner.create();

            // run the engine
            Runner.run(this.runner, this.engine);

            instance = this;
        }

        return instance;
    }

    resizeRender(width, height) {
        this.render.bounds.max.x = width;
        this.render.bounds.max.y = height;
        this.render.options.width = width;
        this.render.options.height = height;
        this.render.canvas.width = width;
        this.render.canvas.height = height;
    }

    buildEngine() {
        let keepStatic = false;
        Composite.clear(this.engine.world, keepStatic);

        let w = this.render.options.width;
        let h = this.render.options.height;

        let els = [];

        // frame
        let frT = frameThickness(w);
        // left, top, right, bottom of frame 
        els.push(Bodies.rectangle(frT / 2, h / 2, frT, h - frT * 2, { isStatic: true }));
        els.push(Bodies.rectangle(w / 2, frT / 2, w - frT * 2, frT, { isStatic: true }));
        els.push(Bodies.rectangle(w - frT / 2, h / 2, frT, h - frT * 2, { isStatic: true }));
        els.push(Bodies.rectangle(w / 2, h - frT / 2, w - frT * 2, frT, { isStatic: true }));

        // left of hat
        // Part C
        // Part B
        // Part A
        let hatPartH = h / 12;
        let hatPartALength = hatPartH / 0.92; // cos 22.5deg
        let hatPartA = Bodies.rectangle(frT / 2, hatPartH * 3 - hatPartALength / 2, frT, hatPartALength, { isStatic: true });
        Body.rotate(hatPartA, Math.PI / 8, { x: hatPartA.position.x + frT / 2, y: hatPartA.position.y + hatPartALength / 2 });
        // find connecting point of part B from part A
        let hatPartBX = frT + hatPartALength * 0.38; // sin 22.5deg
        let hatPartBY = hatPartH * 3 - hatPartALength * 0.92; // cos 22.5deg
        let hatPartBLength = hatPartH / 0.71; // cos 45deg
        let hatPartB = Bodies.rectangle(hatPartBX - frT / 2, hatPartBY - hatPartBLength / 2, frT, hatPartBLength, { isStatic: true });
        Body.rotate(hatPartB, Math.PI / 4, { x: hatPartB.position.x + frT / 2, y: hatPartB.position.y + hatPartBLength / 2 });
        els.push(hatPartA, hatPartB);


        // ball
        let r = ballRadius(w);
        els.push(Bodies.circle(50, 50, r, {
            restitution: 1,
            render: {
                fillStyle: '#ECECEC',
                strokeStyle: '#D7D7D7',
                lineWidth: 1,
            }
        }));

        // base
        let baseSide = w / 4;
        let baseY = h - 2 * baseSide; // base starting y coordinate
        let vertices = [
            { x: frT, y: baseY },
            { x: frT, y: baseY + baseSide },
            { x: frT + baseSide, y: baseY + baseSide },
        ];
        let comL = this.regularCenterOfMass(vertices);
        els.push(Bodies.fromVertices(comL.x, comL.y, vertices, { isStatic: true }));
        let vertices2 = [
            { x: w - frT, y: baseY },
            { x: w - frT, y: baseY + baseSide },
            { x: w - frT - baseSide, y: baseY + baseSide },
        ];
        let comR = this.regularCenterOfMass(vertices2);
        els.push(Bodies.fromVertices(comR.x, comR.y, vertices2, { isStatic: true }));

        // bars
        let barSide = w / 4;
        let barT = frT; // bar thickness
        let barLX = baseSide + barSide / 2 - r;
        let barY = baseY + baseSide + barT;
        let barL = Bodies.rectangle(barLX, barY, barSide, barT, {
            chamfer: 4,
            render: {
                fillStyle: '#03AC13',
                strokeStyle: '#028A0F',
                lineWidth: 1,
            }
        });
        let barRX = w - baseSide - barSide / 2 + r;
        let barR = Bodies.rectangle(barRX, barY, barSide, barT, {
            chamfer: 4,
            render: {
                fillStyle: '#D21404',
                strokeStyle: '#990F02',
                lineWidth: 1,
            }
        });
        let pivotOffset = barSide / 4;
        let barLConstraint = Constraint.create({
            pointA: { x: barLX - pivotOffset, y: barY },
            pointB: { x: -pivotOffset, y: 0 },
            bodyB: barL,
            length: 0
        });
        let barRConstraint = Constraint.create({
            pointA: { x: barRX + pivotOffset, y: barY },
            pointB: { x: pivotOffset, y: 0 },
            bodyB: barR,
            length: 0
        });
        // set controllers
        this.barL = barL;
        this.barR = barR;
        // bar stands
        let standRadius = r;
        let standDist = pivotOffset;
        let standLX = barLX;
        let standY = barY + standDist;
        let standRX = barRX;
        let standL = Bodies.circle(standLX, standY, standRadius, { isStatic: true });
        let standR = Bodies.circle(standRX, standY, standRadius, { isStatic: true });
        els.push(barL, barLConstraint, standL, barR, barRConstraint, standR);
        Composite.add(this.engine.world, els);
    }

    // calculate center of mass of regular shape
    // vertices: array of {x, y}
    // return {x, y} coordinate
    regularCenterOfMass(vertices) {
        let x = 0;
        let y = 0;
        for (const verts of vertices) {
            x += verts.x || 0;
            y += verts.y || 0;
        }
        return {
            x: x / vertices.length,
            y: y / vertices.length,
        };
    }

    // return object's barL and barR
    getControlBars() {
        return {
            left: this.barL,
            right: this.barR
        }
    }
}

export default MatterObject;
