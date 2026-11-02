// Akbar AR — mystery box recreation (motion matched to reference video)
// Builds: comp "Main" (transparent, no background) + comp "Preview" (sunburst bg + Main)
// Run: osascript -e 'tell application "Adobe After Effects 2026" to DoScriptFile "<this file>"'
// Optional: $.global.AKBAR_STILLS = [times] to only export preview PNG frames.

(function () {
var ROOT = new File($.fileName).parent.fsName + "/";
var LOG = new File(ROOT + "build.log");
LOG.open("w");
function log(s) { LOG.writeln(s); }

try {
    var W = 1920, H = 1080, FPS = 30, DUR = 5.4;
    var CUT = 3.3; // camera cut to low-angle reveal

    app.newProject();
    var proj = app.project;
    app.beginUndoGroup("Akbar Box");

    var main = proj.items.addComp("Main", W, H, 1, DUR, FPS);
    main.bgColor = [0, 0, 0];
    main.motionBlur = true;
    main.shutterAngle = 200;
    main.shutterPhase = -100;

    // ---------- helpers ----------
    function keys(prop, arr, ease) {
        // arr: [[t, v], ...]; ease: "lin" | "hold" | number (influence %) default 60
        for (var i = 0; i < arr.length; i++) prop.setValueAtTime(arr[i][0], arr[i][1]);
        for (var k = 1; k <= prop.numKeys; k++) {
            if (ease === "hold") {
                prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD);
            } else if (ease === "lin") {
                prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR);
            } else {
                var inf = (typeof ease === "number") ? ease : 60;
                var dims = (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) ? 1 :
                           (prop.value instanceof Array ? prop.value.length : 1);
                var e = []; for (var d = 0; d < dims; d++) e.push(new KeyframeEase(0, inf));
                try { prop.setTemporalEaseAtKey(k, e, e); } catch (err) {}
            }
        }
        if (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) {
            for (var k2 = 1; k2 <= prop.numKeys; k2++) { try { prop.setSpatialAutoBezierAtKey(k2, true); } catch (e2) {} }
        }
    }
    function rgb(h) { return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]; }
    function nullLayer(comp, name, threeD) {
        var n = comp.layers.addNull(DUR);
        n.name = name; n.threeDLayer = !!threeD;
        n.anchorPoint.setValue(threeD ? [0, 0, 0] : [0, 0]);
        return n;
    }
    function face(comp, name, color, w, h, parent, pos, rot) {
        var s = comp.layers.addSolid(color, name, w, h, 1, DUR);
        s.threeDLayer = true;
        s.parent = parent;
        s.position.setValue(pos);
        if (rot) { s.xRotation.setValue(rot[0]); s.yRotation.setValue(rot[1]); s.zRotation.setValue(rot[2]); }
        s.motionBlur = true;
        var m = s.property("ADBE Material Options Group");
        m.property("ADBE Diffuse Coefficient").setValue(70);
        m.property("ADBE Specular Coefficient").setValue(12);
        m.property("ADBE Shininess Coefficient").setValue(8);
        m.property("ADBE Ambient Coefficient").setValue(100);
        // subtle paper grain + soft edge darkening so faces don't look flat
        try { var nz = s.Effects.addProperty("ADBE Noise"); nz.property(1).setValue(4); } catch (en) {}
        return s;
    }
    function shapeLayer(comp, name) {
        var l = comp.layers.addShape(); l.name = name; l.motionBlur = true; return l;
    }
    function addPathGroup(layer, name, verts, inT, outT, fillHex, strokeHex, strokeW, closed) {
        var root = layer.property("ADBE Root Vectors Group");
        var g = root.addProperty("ADBE Vector Group"); g.name = name;
        var c = g.property("ADBE Vectors Group");
        var p = c.addProperty("ADBE Vector Shape - Group");
        var sh = new Shape();
        sh.vertices = verts; sh.closed = (closed !== false);
        if (inT) sh.inTangents = inT; if (outT) sh.outTangents = outT;
        p.property("ADBE Vector Shape").setValue(sh);
        if (fillHex !== null && fillHex !== undefined) {
            var f = c.addProperty("ADBE Vector Graphic - Fill");
            f.property("ADBE Vector Fill Color").setValue(rgb(fillHex));
        }
        if (strokeHex !== null && strokeHex !== undefined) {
            var st = c.addProperty("ADBE Vector Graphic - Stroke");
            st.property("ADBE Vector Stroke Color").setValue(rgb(strokeHex));
            st.property("ADBE Vector Stroke Width").setValue(strokeW || 2);
        }
        return g;
    }
    function addRect(layer, name, x, y, w, h, fillHex, round) {
        var root = layer.property("ADBE Root Vectors Group");
        var g = root.addProperty("ADBE Vector Group"); g.name = name;
        var c = g.property("ADBE Vectors Group");
        var r = c.addProperty("ADBE Vector Shape - Rect");
        r.property("ADBE Vector Rect Size").setValue([w, h]);
        r.property("ADBE Vector Rect Position").setValue([x + w / 2, y + h / 2]);
        if (round) r.property("ADBE Vector Rect Roundness").setValue(round);
        var f = c.addProperty("ADBE Vector Graphic - Fill");
        f.property("ADBE Vector Fill Color").setValue(rgb(fillHex));
        return g;
    }
    function addEllipse(layer, name, cx, cy, w, h, fillHex) {
        var root = layer.property("ADBE Root Vectors Group");
        var g = root.addProperty("ADBE Vector Group"); g.name = name;
        var c = g.property("ADBE Vectors Group");
        var e = c.addProperty("ADBE Vector Shape - Ellipse");
        e.property("ADBE Vector Ellipse Size").setValue([w, h]);
        e.property("ADBE Vector Ellipse Position").setValue([cx, cy]);
        var f = c.addProperty("ADBE Vector Graphic - Fill");
        f.property("ADBE Vector Fill Color").setValue(rgb(fillHex));
        return g;
    }
    function glow(layer, radius, intensity, threshold) {
        var g = layer.Effects.addProperty("ADBE Glo2");
        try {
        g.property("ADBE Glo2-0002").setValue(threshold || 60); // threshold
        g.property("ADBE Glo2-0003").setValue(radius || 30);     // radius
        g.property("ADBE Glo2-0004").setValue(intensity || 1);   // intensity
        } catch (eg) { log("glow prop fail " + eg); }
        return g;
    }

    // ---------- box geometry ----------
    var BW = 420, BD = 420, BH = 330;      // base
    var O = 10, LH = 84;                     // lid overhang + height
    var LW = BW + 2 * O, LD = BD + 2 * O;
    var CARD_TOP = rgb(0xD9A85C), CARD_SIDE = rgb(0xCF9C52), CARD_IN = rgb(0x6B4A22);

    // Light rig (classic 3D)
    var amb = main.layers.addLight("Ambient", [W / 2, H / 2]);
    amb.lightType = LightType.AMBIENT;
    amb.property("ADBE Light Options Group").property("ADBE Light Intensity").setValue(18);
    var key = main.layers.addLight("Key", [W / 2, H / 2]);
    key.lightType = LightType.PARALLEL;
    key.property("ADBE Light Options Group").property("ADBE Light Intensity").setValue(118);
    key.property("ADBE Light Options Group").property("ADBE Light Color").setValue(rgb(0xFFF1D6));
    key.position.setValue([W / 2 - 1800, H / 2 - 1500, -700]);
    key.pointOfInterest.setValue([W / 2 + 200, H / 2, 0]);
    var rim = main.layers.addLight("Rim", [W / 2, H / 2]);
    rim.lightType = LightType.PARALLEL;
    rim.property("ADBE Light Options Group").property("ADBE Light Intensity").setValue(25);
    rim.property("ADBE Light Options Group").property("ADBE Light Color").setValue(rgb(0xC9A0FF));
    rim.position.setValue([W / 2 + 1500, H / 2 - 400, 900]);
    rim.pointOfInterest.setValue([W / 2, H / 2, 0]);

    var BOX = nullLayer(main, "BOX", true);      // origin = base bottom centre
    var LID = nullLayer(main, "LID", true);
    LID.parent = BOX;
    LID.position.setValue([0, -BH - 14, 0]);     // lid top plane

    // base (open top). Inner walls are separate darker layers, inset 1px.
    var fFront = face(main, "Base Front", CARD_SIDE, BW, BH, BOX, [0, -BH / 2, -BD / 2], [0, 0, 0]);
    var fBack  = face(main, "Base Back",  CARD_SIDE, BW, BH, BOX, [0, -BH / 2,  BD / 2], [0, 0, 0]);
    var fLeft  = face(main, "Base Left",  CARD_SIDE, BD, BH, BOX, [-BW / 2, -BH / 2, 0], [0, 90, 0]);
    var fRight = face(main, "Base Right", CARD_SIDE, BD, BH, BOX, [ BW / 2, -BH / 2, 0], [0, 90, 0]);
    var fBot   = face(main, "Base Bottom", CARD_IN,  BW, BD, BOX, [0, -1, 0], [90, 0, 0]);
    var iBack  = face(main, "Inner Back",  CARD_IN, BW - 2, BH - 2, BOX, [0, -BH / 2, BD / 2 - 1], [0, 0, 0]);
    var iRight = face(main, "Inner Right", CARD_IN, BD - 2, BH - 2, BOX, [BW / 2 - 1, -BH / 2, 0], [0, 90, 0]);
    var iLeft  = face(main, "Inner Left",  CARD_IN, BD - 2, BH - 2, BOX, [-BW / 2 + 1, -BH / 2, 0], [0, 90, 0]);
    var iFront = face(main, "Inner Front", CARD_IN, BW - 2, BH - 2, BOX, [0, -BH / 2, -BD / 2 + 1], [0, 0, 0]);
    // inner walls only matter once the lid is gone
    var innerLayers = [iBack, iRight, iLeft, iFront, fBot];
    for (var il = 0; il < innerLayers.length; il++) innerLayers[il].opacity.setValue(100);

    // lid
    var lTop   = face(main, "Lid Top",   CARD_TOP, LW, LD, LID, [0, 0, 0], [90, 0, 0]);
    var lFront = face(main, "Lid Front", CARD_SIDE, LW, LH, LID, [0, LH / 2, -LD / 2], [0, 0, 0]);
    var lBack  = face(main, "Lid Back",  CARD_SIDE, LW, LH, LID, [0, LH / 2,  LD / 2], [0, 0, 0]);
    var lLeft  = face(main, "Lid Left",  CARD_SIDE, LD, LH, LID, [-LW / 2, LH / 2, 0], [0, 90, 0]);
    var lRight = face(main, "Lid Right", CARD_SIDE, LD, LH, LID, [ LW / 2, LH / 2, 0], [0, 90, 0]);

    // embossed logo (replaces the reference's eBay mark) on base-left face and lid top
    function logo(name, parent, pos, rot, size) {
        var t = main.layers.addText("AKBAR");
        t.name = name; t.threeDLayer = true; t.parent = parent;
        var td = t.property("Source Text").value;
        td.resetCharStyle(); td.fontSize = size; td.font = "HelveticaNeue-Bold";
        td.fillColor = rgb(0x8A5F2A); td.justification = ParagraphJustification.CENTER_JUSTIFY; td.tracking = 20;
        t.property("Source Text").setValue(td);
        var r = t.sourceRectAtTime(0, false);
        t.anchorPoint.setValue([r.left + r.width / 2, r.top + r.height / 2, 0]);
        t.position.setValue(pos);
        t.xRotation.setValue(rot[0]); t.yRotation.setValue(rot[1]); t.zRotation.setValue(rot[2]);
        t.opacity.setValue(55);
        t.property("ADBE Material Options Group").property("ADBE Ambient Coefficient").setValue(100);
        return t;
    }
    // faces: base-left face sits at x=-BW/2 facing -x. Offset 1px outward so it sits on top.
    // side logo removed for now (rendered on the inner wall); lid logo only
    logo("Logo Lid", LID, [0, -1.5, 0], [-90, 0, 0], 70);

    // ---------- box animation (scene 1) ----------
    BOX.position.setValue([0, 0, 0]);
    // yaw: reference shows left face slightly wider, gentle sway; at cut we re-orient for the low shot
    keys(BOX.yRotation, [[0, 38], [0.6, 41], [0.95, 44], [1.25, 37], [1.6, 39], [2.4, 40], [CUT - 0.01, 40]], 50);
    var yr = BOX.yRotation; yr.setValueAtTime(CUT, 22);
    yr.setInterpolationTypeAtKey(yr.nearestKeyIndex(CUT - 0.01), KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.HOLD);

    keys(BOX.xRotation, [[0, 0], [0.95, 0], [1.08, -14], [1.3, 3], [1.5, 0], [2.62, 0], [2.78, -4], [2.98, 2], [3.05, 0]], 55);
    // position (in world; camera frames it). y=0 rest. Hop up before the cursor hits, drop/squash on impact.
    keys(BOX.position, [[0, [0, 0, 0]], [0.55, [10, -8, 0]], [0.85, [25, -45, 0]], [1.02, [0, 30, 0]], [1.18, [-10, 55, 0]], [1.38, [0, -6, 0]], [1.55, [0, 0, 0]],
                        [2.62, [0, 0, 0]], [2.8, [10, 18, 0]], [2.98, [0, -10, 0]], [3.08, [0, 28, 0]], [3.2, [0, 40, 0]]], 55);
    // scale: impact squash at ~1.0s, click-press 2.65–2.95, release pop 3.0, lid launch squash 3.08
    keys(BOX.scale, [[0, [100, 100, 100]], [0.95, [100, 100, 100]], [1.05, [112, 84, 112]], [1.22, [104, 94, 104]], [1.38, [97, 104, 97]], [1.55, [100, 100, 100]],
                     [2.62, [100, 100, 100]], [2.72, [92, 88, 92]], [2.92, [90, 87, 90]], [3.0, [104, 106, 104]], [3.08, [108, 90, 108]], [3.2, [100, 100, 100]]], 55);
    // after the cut, settle the box at rest (hold)
    BOX.position.setValueAtTime(CUT, [0, 0, 0]);
    BOX.scale.setValueAtTime(CUT, [100, 100, 100]);
    BOX.xRotation.setValueAtTime(CUT, 0);
    function holdBefore(prop, t) { var i = prop.nearestKeyIndex(t); if (i > 1) prop.setInterpolationTypeAtKey(i - 1, prop.keyInInterpolationType(i - 1), KeyframeInterpolationType.HOLD); }
    holdBefore(BOX.position, CUT); holdBefore(BOX.scale, CUT); holdBefore(BOX.xRotation, CUT);

    // lid launch: straight up and out of frame, slight tumble
    keys(LID.position, [[3.04, [0, -BH - 14, 0]], [3.12, [0, -BH - 230, 0]], [3.2, [0, -BH - 520, 0]], [3.3, [0, -BH - 1000, 0]]], "lin");
    keys(LID.xRotation, [[3.04, 0], [3.3, -10]], "lin");
    keys(LID.zRotation, [[3.04, 0], [3.3, 4]], "lin");
    // lid faces vanish after it has left (so the low-angle shot is lidless)
    var lidFaces = [lTop, lFront, lBack, lLeft, lRight];
    for (var lf = 0; lf < lidFaces.length; lf++) lidFaces[lf].outPoint = CUT;
    main.layer("Logo Lid").outPoint = CUT;

    // ---------- cameras ----------
    var zoom = 2666.7;
    function cam(name, poi, el, dist, inP, outP) {
        var c = main.layers.addCamera(name, [W / 2, H / 2]);
        c.property("ADBE Camera Options Group").property("ADBE Camera Zoom").setValue(zoom);
        var r = el * Math.PI / 180;
        c.pointOfInterest.setValue(poi);
        c.position.setValue([poi[0], poi[1] - dist * Math.sin(r), poi[2] - dist * Math.cos(r)]);
        c.inPoint = inP; c.outPoint = outP;
        return c;
    }
    // Scene 1: high 3/4 view, box slightly left of centre and a bit low.
    var cam1 = cam("Cam 1 High", [96, -BH / 2 - 60, 0], 30, 2500, 0, CUT);
    // tiny handheld-ish drift
    var c1p = cam1.position.value, c1i = cam1.pointOfInterest.value;
    keys(cam1.position, [[0, c1p], [CUT, [c1p[0] - 30, c1p[1] + 15, c1p[2] + 80]]], 30);
    // Scene 2: low angle, box at bottom-centre, slow push-in
    var cam2 = cam("Cam 2 Low", [60, -BH / 2 - 420, 0], 14, 2000, CUT, DUR);
    var c2p = cam2.position.value;
    keys(cam2.position, [[CUT, [c2p[0] + 40, c2p[1] - 30, c2p[2] - 60]], [CUT + 0.25, c2p], [DUR, [c2p[0] - 10, c2p[1], c2p[2] + 60]]], 40);

    // ---------- red glow burst at the opening (scene 1, 3.08–3.3) ----------
    var burst = shapeLayer(main, "Open Burst");
    addEllipse(burst, "glow", 0, 0, 340, 120, 0xFF3D7A);
    burst.Effects.addProperty("ADBE Gaussian Blur 2").property("ADBE Gaussian Blur 2-0001").setValue(60);
    burst.blendingMode = BlendingMode.ADD;
    burst.inPoint = 3.06; burst.outPoint = CUT;
    keys(burst.opacity, [[3.06, 0], [3.14, 100], [3.28, 80]], "lin");
    keys(burst.scale, [[3.06, [40, 40]], [3.2, [130, 130]]], "lin");
    // 2D screen position of box opening in scene 1 (~ (0.47,0.47) of frame)
    burst.position.setValue([880, 470]);

    // ---------- cursor (pixel arrow) ----------
    var cur = shapeLayer(main, "Cursor");
    var BMP = [
        "B",
        "BB",
        "BWB",
        "BWWB",
        "BWWWB",
        "BWWWWB",
        "BWWWWWB",
        "BWWWWWWB",
        "BWWWWWWWB",
        "BWWWWWWWWB",
        "BWWWWWWWWWB",
        "BWWWWWWBBBBB",
        "BWWWBWWB",
        "BWWB BWWB",
        "BWB  BWWB",
        "BB    BWWB",
        "B     BWWB",
        "       BWWB",
        "        BB"
    ];
    var P = 6;
    for (var row = 0; row < BMP.length; row++) {
        var line = BMP[row], col = 0;
        while (col < line.length) {
            var ch = line.charAt(col);
            if (ch === " ") { col++; continue; }
            var start = col; while (col < line.length && line.charAt(col) === ch) col++;
            // white body with a light-grey shade towards the bottom (matches the reference's soft grey cursor)
            var shade = ch === "B" ? 0x6E6E74 : (row > 10 ? 0xD8D8DE : 0xF4F4F8);
            addRect(cur, "r" + row + "_" + start, start * P, row * P, (col - start) * P, P, shade, 0);
        }
    }
    cur.anchorPoint.setValue([0, 0]);
    var ds = cur.Effects.addProperty("ADBE Drop Shadow");
    ds.property("ADBE Drop Shadow-0002").setValue(45); ds.property("ADBE Drop Shadow-0005").setValue(10); ds.property("ADBE Drop Shadow-0004").setValue(4);
    // rotation: 0 = tip pointing up-left (default bitmap); +90 = up-right; +135 = right; +180 = down-right; +225 = down; +315 = left
    keys(cur.position, [
        [0.00, [70, 730]], [0.30, [95, 690]], [0.50, [190, 610]], [0.65, [300, 565]], [0.78, [400, 545]],
        [0.90, [540, 530]], [1.00, [700, 520]], [1.02, [715, 520]],
        [1.30, [1190, 515]], [1.42, [1320, 560]], [1.52, [1420, 610]], [1.62, [1475, 665]], [1.70, [1490, 720]],
        [1.78, [1455, 745]], [1.88, [1385, 752]], [2.00, [1290, 750]], [2.12, [1225, 742]], [2.28, [1135, 718]],
        [2.45, [1075, 700]], [2.60, [1060, 696]], [2.72, [1050, 640]], [2.92, [1050, 640]], [3.00, [1095, 700]],
        [3.10, [1220, 890]], [3.24, [1380, 1180]]], 35);
    keys(cur.rotation, [
        [0.00, 60], [0.30, 70], [0.50, 92], [0.65, 118], [0.78, 135], [1.02, 135],
        [1.29, 180], [1.42, 182], [1.52, 200], [1.62, 222], [1.70, 248], [1.78, 290], [1.88, 312], [2.00, 318],
        [2.12, 326], [2.28, 352], [2.45, 360], [3.24, 360]], 35);
    keys(cur.scale, [
        [0.00, [260, 260]], [0.30, [255, 255]], [0.50, [220, 220]], [0.65, [175, 175]], [0.78, [150, 150]],
        [0.90, [130, 130]], [1.02, [115, 115]],
        [1.29, [22, 22]], [1.42, [28, 28]], [1.52, [34, 34]], [1.62, [42, 42]], [1.70, [52, 52]], [1.78, [62, 62]],
        [1.88, [72, 72]], [2.00, [82, 82]], [2.12, [92, 92]], [2.28, [104, 104]], [2.45, [114, 114]], [2.60, [118, 118]],
        [2.72, [92, 92]], [2.92, [92, 92]], [3.00, [125, 125]], [3.10, [135, 135]], [3.24, [140, 140]]], 35);
    keys(cur.opacity, [[0, 100], [1.0, 100], [1.03, 0], [1.28, 0], [1.30, 100]], "hold");
    cur.outPoint = 3.25;

    // ================= Scene 2 (from CUT) =================
    var SRC = [905, 905]; // beam source = box opening in the low shot

    // beams are 2D; they sit between the box's back/inner walls and its front walls.
    function beam(name, hex, verts, inT, outT, glowOn) {
        var b = shapeLayer(main, name);
        addPathGroup(b, "beam", verts, inT, outT, hex, null);
        b.anchorPoint.setValue(SRC); b.position.setValue(SRC);
        b.inPoint = CUT;
        if (glowOn) glow(b, 40, 0.45, 70);
        b.Effects.addProperty("ADBE Gaussian Blur 2").property("ADBE Gaussian Blur 2-0001").setValue(3);
        return b;
    }
    // yellow: curves up-left to the top edge (x≈330..720)
    var yellow = beam("Beam Yellow", 0xF5D33A,
        [[SRC[0] - 8, SRC[1]], [300, -40], [770, -40], [SRC[0] + 18, SRC[1]]],
        [[0, 0], [260, 300], [0, 0], [-60, -200]],
        [[-60, -330], [0, 0], [70, 330], [0, 0]], true);
    // magenta: nearly straight up (x≈760..1110 at top)
    var magenta = beam("Beam Magenta", 0xE12BD2,
        [[SRC[0] - 6, SRC[1]], [690, -40], [1110, -40], [SRC[0] + 26, SRC[1]]],
        [[0, 0], [20, 200], [0, 0], [10, -260]],
        [[-60, -380], [0, 0], [-30, 330], [0, 0]], true);
    // dark beam: black wedge to upper-right with a thin light edge
    var dark = beam("Beam Dark", 0x050208,
        [[SRC[0] + 10, SRC[1]], [1080, -40], [1500, -40], [SRC[0] + 40, SRC[1]]],
        [[0, 0], [0, 0], [0, 0], [-150, -200]],
        [[0, 0], [0, 0], [-200, 420], [0, 0]], false);
    addPathGroup(dark, "edge", [[SRC[0] + 40, SRC[1]], [1500, -40]], [[0, 0], [-200, 420]], [[-150, -200], [0, 0]], null, 0xBDB6C9, 2.5, false);

    // burst-in: sweep from the right with overshoot, then gentle wobble
    var beams = [[yellow, -28, 0.00], [magenta, -18, 0.02], [dark, -10, 0.04]];
    for (var bi = 0; bi < beams.length; bi++) {
        var bl = beams[bi][0], r0 = beams[bi][1], dt = beams[bi][2];
        keys(bl.scale, [[CUT, [20, 10]], [CUT + 0.10 + dt, [90, 120]], [CUT + 0.22 + dt, [100, 100]]], 45);
        keys(bl.rotation, [[CUT, r0 + 40], [CUT + 0.12 + dt, r0 * -0.15], [CUT + 0.26 + dt, 0]], 45);
        bl.rotation.expression = "value + Math.sin((time-" + CUT + ")*2.1+" + bi + ")*0.9";
    }

    // sparkles during the burst
    var spk = shapeLayer(main, "Sparkles");
    var spots = [[640, 300], [1180, 410], [1240, 250], [520, 620], [1010, 180], [790, 470], [1350, 520]];
    for (var sp = 0; sp < spots.length; sp++) addEllipse(spk, "s" + sp, spots[sp][0], spots[sp][1], 7, 7, 0xFFFFFF);
    spk.position.setValue([0, 0]);
    spk.inPoint = CUT; spk.outPoint = CUT + 0.45; spk.blendingMode = BlendingMode.ADD;
    keys(spk.opacity, [[CUT, 0], [CUT + 0.08, 100], [CUT + 0.45, 0]], "lin");
    glow(spk, 12, 1.5, 30);

    // items (placeholder shapes until Higgsfield sprites are available)
    function item(name, buildFn, pos, rot, scl, popT) {
        var l = shapeLayer(main, name);
        buildFn(l);
        l.anchorPoint.setValue([0, 0]);
        l.inPoint = popT;
        keys(l.scale, [[popT, [0, 0]], [popT + 0.12, [scl * 1.12, scl * 1.12]], [popT + 0.22, [scl, scl]]], 50);
        return l;
    }
    var phone = item("Item Phone", function (l) {
        for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) addRect(l, "k" + r + c, -96 + c * 70, -70 + r * 52, 48, 34, 0xC9C3C3, 6);
        addRect(l, "handset", -160, -150, 320, 46, 0xC22B30, 22);
        addRect(l, "body", -150, -110, 300, 200, 0xD6363A, 26);
        addRect(l, "shadowside", -150, -95, 300, 210, 0x9E1E22, 26);
    }, [190, 150], -24, 100, CUT + 0.04);
    keys(phone.position, [[CUT + 0.04, [420, 420]], [CUT + 0.2, [215, 175]], [DUR, [165, 135]]], 40);
    keys(phone.rotation, [[CUT + 0.04, 10], [CUT + 0.2, -22], [DUR, -27]], 40);
    var ps = phone.Effects.addProperty("ADBE Drop Shadow");
    ps.property("ADBE Drop Shadow-0002").setValue(50); ps.property("ADBE Drop Shadow-0005").setValue(18);

    var shirt = item("Item Shirt", function (l) {
        addPathGroup(l, "shade", [[6, -30], [18, -38], [48, -26], [62, 0], [40, 10], [34, -4], [32, 44], [6, 44]], null, null, 0x2E9483, null);
        addPathGroup(l, "shirt",
            [[-18, -38], [-48, -26], [-62, 0], [-40, 10], [-34, -4], [-32, 44], [32, 44], [34, -4], [40, 10], [62, 0], [48, -26], [18, -38], [0, -28]],
            null, null, 0x3FB7A0, null);
    }, [1425, 495], 8, 100, CUT + 0.08);
    keys(shirt.position, [[CUT + 0.08, [1180, 760]], [CUT + 0.24, [1420, 500]], [DUR, [1435, 470]]], 40);
    shirt.rotation.expression = "8 + Math.sin(time*2.4)*4";

    var drum = item("Item Drum", function (l) {
        addPathGroup(l, "stick1", [[-30, -30], [-6, -10]], null, null, null, 0xE8E8E8, 5, false);
        addPathGroup(l, "stick2", [[34, -36], [8, -12]], null, null, null, 0xE8E8E8, 5, false);
        addEllipse(l, "top", 0, -14, 76, 26, 0xFFFFFF);
        addRect(l, "band", -38, 6, 76, 26, 0xC4202C, 10);
        addEllipse(l, "body", 0, 6, 76, 60, 0xF2F2F2);
    }, [655, 660], -6, 100, CUT + 0.1);
    keys(drum.position, [[CUT + 0.1, [860, 900]], [CUT + 0.26, [660, 665]], [DUR, [648, 650]]], 40);
    glow(drum, 18, 1.2, 40);

    // typewriter title
    var title = main.layers.addText("Subscribe to the Channel Lol");
    title.name = "Title";
    var td = title.property("Source Text").value;
    td.resetCharStyle(); td.fontSize = 54; td.font = "HelveticaNeue-Bold"; td.fillColor = [1, 1, 1];
    td.justification = ParagraphJustification.LEFT_JUSTIFY; td.tracking = -10;
    title.property("Source Text").setValue(td);
    title.position.setValue([478, 562]);
    title.inPoint = CUT + 0.08;
    title.property("Source Text").expression =
        'var s="Subscribe to the Channel Lol"; var n=Math.floor(linear(time,' + (CUT + 0.08) + ',4.62,1,s.length+0.999)); s.substr(0,n);';
    var tg = glow(title, 10, 0.6, 70);
    title.motionBlur = false;

    // ---------- layer order ----------
    // top -> bottom: Title(above magenta/dark), Yellow beam(occludes "to"), items, front walls, magenta, dark, inner/back walls
    // AE: moveToBeginning puts on top. Build the stack bottom-up.
    var stack = [ // first = top
        cur, burst, spk, phone, shirt, drum, yellow, title,
        fFront, fLeft, lFront, lLeft, lTop, main.layer("Logo Lid"), lRight, lBack,
        magenta, dark,
        fRight, fBack, iFront, iLeft, iRight, iBack, fBot,
        BOX, LID, cam1, cam2, amb, key, rim
    ];
    for (var si = stack.length - 1; si >= 0; si--) stack[si].moveToBeginning();
    // scene-1 needs the full closed box with normal depth sorting; beams don't exist yet so 2D breaks don't matter.
    // In scene 2 the front walls must cover the beam roots, the back walls sit behind them.
    // Which walls face the low camera: with yRot=22 the front(-z) and left(-x) walls face camera.

    for (var li = 1; li <= main.numLayers; li++) { try { main.layer(li).motionBlur = true; } catch (e3) {} }
    title.motionBlur = false;

    // ---------- preview comp with background ----------
    var prev = proj.items.addComp("Preview", W, H, 1, DUR, FPS);
    var bgSolid = prev.layers.addSolid(rgb(0x050109), "BG Black", W, H, 1, DUR);
    var rays = prev.layers.addShape(); rays.name = "BG Rays";
    var rg = rays.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    var star = rg.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Star");
    star.property("ADBE Vector Star Type").setValue(1);
    star.property("ADBE Vector Star Points").setValue(18);
    star.property("ADBE Vector Star Inner Radius").setValue(260);
    star.property("ADBE Vector Star Outer Radius").setValue(1700);
    try { star.property("ADBE Vector Star Inner Roundess").setValue(0); } catch (es) {}
    var rf = rg.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
    rf.property("ADBE Vector Fill Color").setValue(rgb(0x2C0A4E));
    rays.Effects.addProperty("ADBE Gaussian Blur 2").property("ADBE Gaussian Blur 2-0001").setValue(160);
    keys(rays.position, [[0, [905, 560]], [CUT, [905, 975]]], "hold");
    rays.rotation.expression = "time*4";
    var vig = prev.layers.addShape(); vig.name = "Vignette";
    addEllipse(vig, "v", 0, 0, 2600, 1700, 0x000000);
    vig.position.setValue([W / 2, H / 2]);
    var vm = vig.Effects.addProperty("ADBE Gaussian Blur 2"); vm.property("ADBE Gaussian Blur 2-0001").setValue(300);
    vig.opacity.setValue(0);
    var vg = prev.layers.addSolid([0, 0, 0], "Vignette Solid", W, H, 1, DUR);
    var vmk = vg.Masks.addProperty("ADBE Mask Atom"); var es = new Shape();
    var cx = W / 2, cy = H / 2, rx = 1150, ry = 760, kk = 0.5523;
    es.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]];
    es.inTangents = [[-rx * kk, 0], [0, -ry * kk], [rx * kk, 0], [0, ry * kk]];
    es.outTangents = [[rx * kk, 0], [0, ry * kk], [-rx * kk, 0], [0, -ry * kk]];
    es.closed = true; vmk.property("ADBE Mask Shape").setValue(es);
    vmk.inverted = true; vmk.property("ADBE Mask Feather").setValue([520, 520]);
    vg.opacity.setValue(92);
    rays.blendingMode = BlendingMode.NORMAL;
    var mainL = prev.layers.add(main);
    mainL.moveToBeginning();

    app.endUndoGroup();

    var aep = new File(ROOT + "akbar-box.aep");
    proj.save(aep);
    log("SAVED " + aep.fsName);

    // stills for review
    var stills = $.global.AKBAR_STILLS || [0.5, 1.1, 2.5, 3.15, 3.5, 4.8];
    var sd = new Folder(ROOT + "stills"); if (!sd.exists) sd.create();
    for (var s = 0; s < stills.length; s++) {
        var t = stills[s];
        prev.saveFrameToPng(t, new File(sd.fsName + "/prev_" + ("" + t).replace(".", "_") + ".png"));
    }
    log("STILLS " + stills.length);
    log("OK");
} catch (err) {
    log("ERROR line " + err.line + ": " + err.toString());
}
LOG.close();
})();
