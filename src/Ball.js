import * as THREE from "three";

// Gravedad
const G = 0.0003;
// Número máximo de puntos en la línea de trayectoria
const MAX_POINTS = 180;
// Sonidos
const scoreSound = new Audio("../sounds/score.mp3");
const bounceSound = new Audio("../sounds/bounce.mp3");
// Ajuste de volumen para el sonido de rebote
bounceSound.volume = 0.25;

export class Ball {
    constructor(scene) {
        this.scene = scene;
        this.model = undefined; // Modelo de la pelota
        this.shadow = undefined; // Sombra de la pelota
        this.line = undefined; // Línea de trayectoria
        this.linePoints = 0; // Puntos en la línea de trayectoria
        this.boundingSphere = undefined; // Esfera de colisión

        // Posición inicial
        this.x = 36;
        this.y = 6;
        this.z = -12;

        // Velocidades iniciales
        this.dx = 0;
        this.dy = 0;
        this.dz = 0;
        this.d2z = 0;

        // Puntuaciones de los jugadores
        this.score = [0, 0];
    }

    render() {
        // Crear geometría y material de la pelota
        const ballGeometry = new THREE.SphereGeometry(0.5, 32, 16);
        const ballMaterial = new THREE.MeshBasicMaterial({ color: 0x4933FF });

        // Crear la pelota y establecer su posición
        this.model = new THREE.Mesh(ballGeometry, ballMaterial);
        this.model.position.set(this.x, this.y, this.z);
        this.scene.add(this.model);

        // Crear geometría y material de la sombra
        const shadowGeometry = new THREE.CircleGeometry(0.8, 32);
        const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0xb1e9a8, side: THREE.DoubleSide });

        // Crear la sombra y establecer su posición y rotación
        this.shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        this.shadow.position.set(this.x, 0.015, this.z);
        this.shadow.rotateX(Math.PI / 2);
        this.scene.add(this.shadow);

        // Crear geometría y material de la línea de trayectoria
        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_POINTS * 3), 3));
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

        // Crear la línea de trayectoria y añadirla a la escena
        this.line = new THREE.Line(lineGeometry, lineMaterial);
        this.scene.add(this.line);

        // Crear la esfera de colisión
        this.boundingSphere = new THREE.Sphere(this.model.position, 0.5);
    }

    // Método para iniciar un saque
    serve(player) {
        this.x = player * 36;
        this.y = 6;
        this.z = player * -12;
        this.dx = 0;
        this.dy = 0;
        this.dz = 0;
        this.d2z = 0;

        this.linePoints = 0; // Reiniciar puntos en la línea de trayectoria
    }

    update(net, player1, player2, dt) {
        if (!this.model || !net.boundingBox)
            return;

        // Aplicar gravedad
        this.dy -= G;
        if (this.y < 0.5) {
            this.y = 0.5;
            this.dy *= -0.95;
            bounceSound.currentTime = 0;
            bounceSound.play();
        }

        // Rebotes en las paredes invisibles
        if (Math.abs(this.z) > 24) {
            this.dz *= -1;
            bounceSound.currentTime = 0;
            bounceSound.play();
        }

        // Comprobar si la pelota está fuera de los límites
        if (this.x > 64) {
            this.serve(1);
            this.score[1] += 15;
            scoreSound.currentTime = 0;
            scoreSound.play();
        } else if (this.x < -64) {
            this.serve(-1);
            this.score[0] += 15;
            scoreSound.currentTime = 0;
            scoreSound.play();
        }
        document.getElementById("score").textContent = `${this.score[0]} : ${this.score[1]}`;

        // Colisiones
        // Con la red
        if (this.boundingSphere.intersectsBox(net.boundingBox)) {
            this.x = this.x > 0 ? 1 : -1;
            this.dx *= -1;
            bounceSound.currentTime = 0;
            bounceSound.play();
        }

        // Con las raquetas de los jugadores
        if (this.boundingSphere.intersectsBox(player1.boundingBox) &&
            player1.swinging && !player1.charging) {
            player1.hit(this);
        }

        if (this.boundingSphere.intersectsBox(player2.boundingBox) &&
            player2.swinging && !player2.charging) {
            player2.hit(this);
        }

        // Aplicar efecto de giro
        this.dz += this.d2z;
        this.d2z *= 0.95;

        // Mover la pelota
        this.x += this.dx * dt;
        this.y += this.dy * dt;
        this.z += this.dz * dt;
        this.model.position.set(this.x, this.y, this.z);
        this.boundingSphere.set(this.model.position, 0.5);

        // Ajustar escala y posición de la sombra
        let shadowScale = (25 - this.y) / 25;
        this.shadow.scale.set(shadowScale, shadowScale, shadowScale);
        this.shadow.position.set(this.x, 0.015, this.z);

        // Actualizar la línea de trayectoria
        if (this.linePoints < MAX_POINTS) {
            this.line.geometry.attributes.position.array[this.linePoints * 3] = this.x;
            this.line.geometry.attributes.position.array[this.linePoints * 3 + 1] = this.y;
            this.line.geometry.attributes.position.array[this.linePoints * 3 + 2] = this.z;
            this.line.geometry.attributes.position.needsUpdate = true;
            this.line.geometry.setDrawRange(0, this.linePoints);
            this.linePoints++;
        } else {
            for (let i = 0; i < MAX_POINTS * 3; i++)
                this.line.geometry.attributes.position.array[i] =
                    this.line.geometry.attributes.position.array[i + 3];

            this.line.geometry.attributes.position.array[MAX_POINTS * 3 - 3] = this.x;
            this.line.geometry.attributes.position.array[MAX_POINTS * 3 - 2] = this.y;
            this.line.geometry.attributes.position.array[MAX_POINTS * 3 - 1] = this
