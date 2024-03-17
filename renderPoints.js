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

// initialize and link the shader program
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

// parse OBJ file text and extract vertices and normals
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

// render the scene with normals
function drawSceneWithNormals(gl, shaderProgram, vertexCount, lightPosition, positionBuffer, normalBuffer) {
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

    gl.drawArrays(gl.POINTS, 0, vertexCount);
}

function main() {
    const canvas = document.getElementById('webgl-canvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser may not support it.');
        return;
    }

    // Vertex shader
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

    // Fragment shader
    const fsSource = `
        precision mediump float;
        varying vec3 vVertexPosition;
        varying vec3 vNormal;
        uniform vec3 uLightPosition;
        void main() {
            vec3 lightDirection = normalize(uLightPosition - vVertexPosition);
            float brightness = max(dot(normalize(vNormal), lightDirection), 0.0); // Clamp to positive values only
            // Calculate gray color based on Lambertian reflectance
            vec3 color = vec3(brightness);
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    document.getElementById('fileInput').addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            const contents = e.target.result;
            const { vertices, normals } = parseOBJToVerticesAndNormals(contents);

            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

            const normalBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

            drawSceneWithNormals(gl, shaderProgram, vertices.length / 3, [1.0, 1.0, 1.0], positionBuffer, normalBuffer);
        };
        reader.readAsText(file);
    });
}

main();
