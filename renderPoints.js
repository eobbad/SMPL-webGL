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

// parse OBJ file text and extract vertices
function parseOBJToVertices(objText) {
    const vertices = [];
    const lines = objText.split('\n');
    for (const line of lines) {
        if (line.startsWith('v ')) {
            const [, x, y, z] = line.split(' ').map(parseFloat);
            vertices.push(x, y, z);
        }
    }
    return vertices;
}

// render the scene
function drawScene(gl, shaderProgram, vertexCount, lightPosition) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shaderProgram);

    const positionAttributeLocation = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

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
        varying vec3 vVertexPosition;
        void main() {
            gl_Position = aVertexPosition;
            vVertexPosition = aVertexPosition.xyz;
            gl_PointSize = 5.0;
        }
    `;

    // Fragment shader
    const fsSource = `
        precision mediump float;
        varying vec3 vVertexPosition;
        uniform vec3 uLightPosition;
        void main() {
            vec3 lightDirection = normalize(uLightPosition - vVertexPosition);
            float brightness = dot(normalize(vVertexPosition), lightDirection);
            gl_FragColor = vec4(brightness, brightness, brightness, 1.0);
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
            const vertices = parseOBJToVertices(contents);

            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

            // Adds a single light to the scene, this keeps the screen from being black
            const lightPosition = [1.0, 1.0, 1.0];

            drawScene(gl, shaderProgram, vertices.length / 3, lightPosition);
        };
        reader.readAsText(file);
    });
}

main();
