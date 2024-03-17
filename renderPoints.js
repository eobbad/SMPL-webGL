function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        throw new Error('Error compiling shader');
    }

    return shader;
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = compileShader(gl, vsSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        throw new Error('Shader program initialization error');
    }

    return shaderProgram;
}

function parseOBJToVerticesAndNormals(objText) {
    const vertices = [];
    const normals = [];
    const lines = objText.split('\n');
    for (const line of lines) {
        if (line.startsWith('v ')) {
            const [, x, y, z] = line.split(' ').map(parseFloat);
            vertices.push(x, y, z);
        } else if (line.startsWith('vn ')) {
            const [, nx, ny, nz] = line.split(' ').map(parseFloat);
            normals.push(nx, ny, nz);
        }
    }
    return { vertices, normals };
}

function drawSceneWithNormals(gl, shaderProgram, vertexCount, lightPosition, positionBuffer, normalBuffer, lightIntensity) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shaderProgram);

    const positionAttributeLocation = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    const normalAttributeLocation = gl.getAttribLocation(shaderProgram, 'aVertexNormal');
    gl.enableVertexAttribArray(normalAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    const lightPositionLocation = gl.getUniformLocation(shaderProgram, 'uLightPosition');
    gl.uniform3fv(lightPositionLocation, lightPosition);

    const lightIntensityLocation = gl.getUniformLocation(shaderProgram, 'uLightIntensity');
    gl.uniform1f(lightIntensityLocation, lightIntensity);

    gl.drawArrays(gl.POINTS, 0, vertexCount);
}

function main() {
    const canvas = document.getElementById('webgl-canvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser may not support it.');
        return;
    }

    let vertices; // Declare vertices array
    let positionBuffer; // Declare positionBuffer globally
    let normalBuffer; // Declare normalBuffer globally
    let lightIntensity; // Declare lightIntensity globally

    const vsSource = `
        attribute vec4 aVertexPosition;
        attribute vec3 aVertexNormal;
        varying vec3 vVertexPosition;
        varying vec3 vNormal;
        void main() {
            gl_Position = aVertexPosition;
            vVertexPosition = aVertexPosition.xyz;
            vNormal = aVertexNormal;
            gl_PointSize = 5.0;
        }
    `;

    const fsSource = `
        precision mediump float;
        varying vec3 vVertexPosition;
        varying vec3 vNormal;
        uniform vec3 uLightPosition;
        uniform float uLightIntensity;
        void main() {
            vec3 lightDirection = normalize(uLightPosition - vVertexPosition);
            float brightness = max(dot(normalize(vNormal), lightDirection), 0.0);
            vec3 color = vec3(brightness) * uLightIntensity;
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // Get sliders for light position
    const lightXSlider = document.getElementById('lightX');
    const lightYSlider = document.getElementById('lightY');
    const lightZSlider = document.getElementById('lightZ');

    // Update light position when sliders are changed
    function updateLightPosition() {
        const lightX = parseFloat(lightXSlider.value);
        const lightY = parseFloat(lightYSlider.value);
        const lightZ = parseFloat(lightZSlider.value);
        drawSceneWithNormals(gl, shaderProgram, vertices.length / 3, [lightX, lightY, lightZ], positionBuffer, normalBuffer, lightIntensity);
    }

    lightXSlider.addEventListener('input', updateLightPosition);
    lightYSlider.addEventListener('input', updateLightPosition);
    lightZSlider.addEventListener('input', updateLightPosition);

    document.getElementById('fileInput').addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            const contents = e.target.result;
            const { vertices: parsedVertices, normals } = parseOBJToVerticesAndNormals(contents);

            vertices = parsedVertices; // Assign vertices array from parsed data

            positionBuffer = gl.createBuffer(); // Initialize positionBuffer
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

            normalBuffer = gl.createBuffer(); // Initialize normalBuffer
            gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

            lightIntensity = 1.0; // Initialize lightIntensity

            drawSceneWithNormals(gl, shaderProgram, vertices.length / 3, [1.0, 1.0, -2.0], positionBuffer, normalBuffer, lightIntensity);
        };
        reader.readAsText(file);
    });
}

main();
