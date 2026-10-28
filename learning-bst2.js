/* CleverMent My Learning Space - Primary 6 BST, Batch 2: Energy; Forces, Motion and Simple Machines; Electricity and Magnetism; Earth and Space. Needs learning-bst.js. */
(function (root) {
    if (!root.CMLearnBst) return;
    var h = root.CMLearnBst.h, X = h.X, S = h.S, D = h.D, cap = h.cap, P = h.P, ri = h.ri, shuf = h.shuf;
    /* ---------- shared helpers for Batch 2 ---------- */
    function numQ(r, q, ans, wrongs, unit, expl, sig) {
        var u = unit ? ' ' + unit : '', w = [], seen = {}; seen[ans] = 1;
        wrongs.forEach(function (x) { if (!seen[x] && x > 0) { seen[x] = 1; w.push(x); } });
        var k = 1; while (w.length < 3) { var c = ans + k * (ans >= 10 ? 5 : 1); if (!seen[c] && c > 0) { seen[c] = 1; w.push(c); } k++; }
        return [q, ans + u, w.slice(0, 3).map(function (x) { return x + u; }), expl, sig];
    }
    function fmt(n) { return String(Math.round(n * 100) / 100); }
    var D2 = {};
    D2.reflect = function () {
        var b = D.title('Reflection of light in a plane mirror');
        b += '<rect x="40" y="170" width="260" height="10" fill="#94a3b8"/><path d="M170 170 L170 60" stroke="#475569" stroke-width="1.5" stroke-dasharray="4 3"/>' + D.arrow(70, 70, 168, 168, '#d97706') + D.arrow(172, 168, 270, 70, '#2563eb');
        b += D.txt(176, 56, 'Normal', 11, '#475569', 1) + D.txt(30, 62, 'Incident ray', 11, '#d97706', 1) + D.txt(300, 80, 'Reflected ray', 11, '#2563eb', 1, 'end') + D.txt(118, 150, 'i', 12, '#0f172a', 1) + D.txt(218, 150, 'r', 12, '#0f172a', 1) + D.txt(170, 200, 'Angle i = angle r', 12, '#0f172a', 1, 'middle') + D.txt(170, 218, 'Mirror', 11, '#475569', 0, 'middle');
        return D.wrap(232, b);
    };
    D2.prism = function () {
        var b = D.title('A prism splits white light'), cols = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#6366f1', '#7c3aed'], nm = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Violet'];
        b += '<path d="M150 70 L200 70 L175 150 Z" transform="rotate(0)" fill="#bae6fd" fill-opacity=".6" stroke="#0284c7" stroke-width="2"/>';
        b += '<path d="M30 110 L160 100" stroke="#475569" stroke-width="4"/>' + D.txt(30, 98, 'White light', 11, '#0f172a', 1);
        cols.forEach(function (c, i) { b += '<path d="M190 110 L300 ' + (76 + i * 14) + '" stroke="' + c + '" stroke-width="4"/>'; });
        b += D.txt(304, 84, 'Red', 10.5, '#dc2626', 1) + D.txt(304, 168, 'Violet', 10.5, '#7c3aed', 1) + D.txt(170, 200, 'Red, orange, yellow, green, blue, indigo, violet', 10.5, '#475569', 0, 'middle');
        return D.wrap(214, b);
    };
    D2.lever = function () {
        var b = D.title('A lever has a fulcrum, effort and load');
        b += '<path d="M40 128 L300 112" stroke="#92400e" stroke-width="8" stroke-linecap="round"/><path d="M170 128 L150 170 L190 170 Z" fill="#64748b"/>';
        b += '<rect x="52" y="82" width="46" height="30" fill="#7c3aed"/>' + D.txt(75, 102, 'Load', 11, '#fff', 1, 'middle') + D.arrow(290, 58, 290, 104, '#dc2626') + D.txt(290, 50, 'Effort', 11, '#dc2626', 1, 'middle') + D.txt(170, 188, 'Fulcrum (pivot)', 11, '#0f172a', 1, 'middle');
        return D.wrap(204, b);
    };
    D2.circuit = function (kind) {
        var b = D.title(kind === 'parallel' ? 'A parallel circuit' : 'A series circuit');
        function bulb(x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="14" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/><path d="M' + (x - 8) + ' ' + (y + 8) + ' L' + (x + 8) + ' ' + (y - 8) + ' M' + (x - 8) + ' ' + (y - 8) + ' L' + (x + 8) + ' ' + (y + 8) + '" stroke="#ca8a04" stroke-width="1.5"/>'; }
        function cell(x, y) { return '<path d="M' + x + ' ' + (y - 14) + ' L' + x + ' ' + (y + 14) + '" stroke="#0f172a" stroke-width="3"/><path d="M' + (x + 9) + ' ' + (y - 8) + ' L' + (x + 9) + ' ' + (y + 8) + '" stroke="#0f172a" stroke-width="3"/>'; }
        if (kind === 'parallel') {
            b += '<path d="M60 60 L280 60 L280 160 L60 160 Z" fill="none" stroke="#475569" stroke-width="2.5"/><path d="M150 60 L150 110 M150 110 L150 160 M230 60 L230 160" stroke="#475569" stroke-width="2.5"/>';
            b += '<rect x="136" y="76" width="28" height="28" fill="#f8fafc"/>' + bulb(150, 90) + '<rect x="216" y="76" width="28" height="28" fill="#f8fafc"/>' + bulb(230, 90) + '<rect x="40" y="95" width="40" height="30" fill="#f8fafc"/>' + cell(56, 110) + D.txt(150, 180, 'Each lamp has its own path', 11, '#0f172a', 1, 'middle');
        } else {
            b += '<path d="M60 70 L280 70 L280 160 L60 160 Z" fill="none" stroke="#475569" stroke-width="2.5"/><rect x="40" y="95" width="40" height="30" fill="#f8fafc"/>' + cell(56, 110) + '<rect x="110" y="56" width="28" height="28" fill="#f8fafc"/>' + bulb(124, 70) + '<rect x="196" y="56" width="28" height="28" fill="#f8fafc"/>' + bulb(210, 70) + D.txt(170, 180, 'One path: current passes through every lamp', 11, '#0f172a', 1, 'middle');
        }
        return D.wrap(196, b);
    };
    D2.magnet = function () {
        var b = D.title('Magnetic field of a bar magnet');
        b += '<rect x="110" y="96" width="60" height="30" fill="#dc2626"/><rect x="170" y="96" width="60" height="30" fill="#2563eb"/>' + D.txt(140, 116, 'N', 14, '#fff', 1, 'middle') + D.txt(200, 116, 'S', 14, '#fff', 1, 'middle');
        [40, 70, 100].forEach(function (k) { b += '<path d="M110 100 C ' + (110 - k) + ' ' + (100 - k) + ', ' + (230 + k) + ' ' + (100 - k) + ', 230 100" fill="none" stroke="#64748b" stroke-width="1.5"/><path d="M110 122 C ' + (110 - k) + ' ' + (122 + k) + ', ' + (230 + k) + ' ' + (122 + k) + ', 230 122" fill="none" stroke="#64748b" stroke-width="1.5"/>'; });
        b += D.txt(170, 222, 'Field lines go from the north pole to the south pole', 11, '#475569', 0, 'middle');
        return D.wrap(236, b);
    };
    D2.solar = function () {
        var b = D.title('The solar system (not to scale)'), pl = [['Mercury', 4, '#94a3b8'], ['Venus', 6, '#f59e0b'], ['Earth', 6.5, '#2563eb'], ['Mars', 5, '#dc2626'], ['Jupiter', 14, '#d97706'], ['Saturn', 12, '#ca8a04'], ['Uranus', 9, '#06b6d4'], ['Neptune', 9, '#4f46e5']], x = 62;
        b += '<circle cx="32" cy="100" r="26" fill="#facc15" stroke="#eab308"/>' + D.txt(32, 146, 'Sun', 11, '#0f172a', 1, 'middle');
        pl.forEach(function (p, i) { x += (i < 4 ? 27 : 32); b += '<circle cx="' + x + '" cy="100" r="' + p[1] + '" fill="' + p[2] + '"/>' + D.txt(x, 124 + (i % 2) * 14, p[0].slice(0, 3), 9.5, '#0f172a', 1, 'middle'); });
        b += D.txt(170, 190, 'Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune', 10, '#475569', 0, 'middle');
        return D.wrap(204, b);
    };
    function lit(cx, cy, r, k, sw) { return '<path d="M' + cx + ' ' + (cy - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + cx + ' ' + (cy + r) + ' A' + Math.max(0.01, Math.abs(k) * r) + ' ' + r + ' 0 0 ' + sw + ' ' + cx + ' ' + (cy - r) + ' Z" fill="#fef9c3"/>'; }
    D2.moon = function () {
        var b = D.title('Phases of the Moon'), ph = [['New', 0], ['Crescent', 1], ['Quarter', 2], ['Gibbous', 3], ['Full', 4]];
        ph.forEach(function (p, i) { var cx = 36 + i * 67, cy = 100, r = 26; b += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#334155"/>'; if (p[1] === 1) b += lit(cx, cy, r, 0.6, 0); if (p[1] === 2) b += lit(cx, cy, r, 0, 0); if (p[1] === 3) b += lit(cx, cy, r, 0.6, 1); if (p[1] === 4) b += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#fef9c3"/>'; b += D.txt(cx, 150, p[0], 11, '#0f172a', 1, 'middle'); });
        b += D.txt(170, 184, 'The Moon goes through all its phases in about 29.5 days', 10.5, '#475569', 0, 'middle');
        return D.wrap(198, b);
    };
    D2.eclipse = function (solar) {
        var b = D.title(solar ? 'Solar eclipse' : 'Lunar eclipse');
        var a = solar ? ['Sun', 'Moon', 'Earth'] : ['Sun', 'Earth', 'Moon'], rs = solar ? [30, 9, 16] : [30, 16, 9], cs = ['#facc15', solar ? '#94a3b8' : '#2563eb', solar ? '#2563eb' : '#94a3b8'];
        b += '<path d="M' + (solar ? 150 : 150) + ' 110 L330 ' + (solar ? 100 : 100) + ' L330 120 Z" fill="#334155" fill-opacity=".25"/>';
        [50, 170, 290].forEach(function (x, i) { b += '<circle cx="' + x + '" cy="110" r="' + rs[i] + '" fill="' + cs[i] + '"/>' + D.txt(x, 166, a[i], 11, '#0f172a', 1, 'middle'); });
        b += D.txt(170, 192, solar ? 'The Moon is between the Sun and the Earth' : 'The Earth is between the Sun and the Moon', 10.5, '#475569', 0, 'middle');
        return D.wrap(206, b);
    };
    D2.compass = function () {
        var b = D.title('A compass rose'); b += '<circle cx="170" cy="120" r="64" fill="#fff" stroke="#334155" stroke-width="2"/><path d="M170 66 L182 120 L170 174 L158 120 Z" fill="#e2e8f0" stroke="#475569"/><path d="M170 66 L182 120 L158 120 Z" fill="#dc2626"/>';
        b += D.txt(170, 58, 'N', 14, '#dc2626', 1, 'middle') + D.txt(170, 192, 'S', 14, '#0f172a', 1, 'middle') + D.txt(246, 125, 'E', 14, '#0f172a', 1, 'middle') + D.txt(94, 125, 'W', 14, '#0f172a', 1, 'middle');
        return D.wrap(204, b);
    };
    D2.rotation = function () {
        var b = D.title('Rotation gives day and night');
        b += '<circle cx="50" cy="110" r="28" fill="#facc15"/>' + D.txt(50, 160, 'Sun', 11, '#0f172a', 1, 'middle') + '<path d="M96 100 L150 100 M96 110 L150 110 M96 120 L150 120" stroke="#f59e0b" stroke-width="2"/><circle cx="240" cy="110" r="50" fill="#1e293b"/><path d="M240 60 A50 50 0 0 0 240 160 Z" fill="#60a5fa"/>' + D.txt(214, 114, 'Day', 11, '#0f172a', 1, 'middle') + D.txt(268, 114, 'Night', 11, '#fff', 1, 'middle') + D.txt(240, 180, 'Earth spins once in about 24 hours', 10.5, '#475569', 0, 'middle');
        return D.wrap(196, b);
    };
    h.D2 = D2; h.numQ = numQ; h.fmt = fmt;

    S("Energy: Heat, Light and Sound");

    X("forms-of-energy", "Forms of energy", {
        i: "Energy is the ability to do work. It comes in many forms: heat, light, sound, electrical, chemical, kinetic (movement), potential (stored) and nuclear energy. Energy is measured in joules.",
        r: "Food gives your body chemical energy. A moving bicycle has kinetic energy. Water behind Kainji Dam has stored potential energy.",
        k: ["Kinetic energy: energy of moving things.", "Potential energy: stored energy because of position or condition.", "Chemical energy is stored in food, fuel and batteries.", "Energy is measured in joules."],
        e: ["What form of energy does a stretched rubber band have?", ["It is not moving yet.", "It has energy stored by its stretched shape."], "Potential energy"],
        d: D.cards("Forms of energy", [["Kinetic", "energy of movement"], ["Potential", "stored energy of position or shape"], ["Chemical", "stored in food, fuel, batteries"], ["Heat, light, sound", "energy we feel, see and hear"], ["Electrical", "energy carried in wires"]]),
        m: "Thinking energy can be used up and disappear. It only changes from one form to another."
    }, {
        mcq: [["Which unit is used to measure energy?", "Joule", ["Newton", "Watt", "Kilogram"], "The joule is the unit of energy."], ["A battery stores energy in which form?", "Chemical energy", ["Sound energy", "Light energy", "Kinetic energy"], "Cells store chemical energy."]],
        cats: { "object with kinetic energy": ["a running boy", "a flying bird", "a moving car", "a falling coconut", "a flowing river", "a rolling ball"], "object with potential energy": ["a stretched rubber band", "a book on a high shelf", "water in a dam", "a compressed spring", "a raised hammer", "a drawn bow"], "thing with chemical energy": ["food", "petrol", "firewood", "a battery", "charcoal", "cooking gas"] },
        pairs: [["energy", "the ability to do work", 0], ["kinetic energy", "the energy of moving things", 0], ["potential energy", "the energy stored in an object because of its position or condition", 0], ["heat energy", "the energy that makes things hot", 0], ["light energy", "the energy that lets us see", 0], ["sound energy", "the energy that we hear", 0], ["electrical energy", "the energy carried by moving charges in wires", 0], ["chemical energy", "the energy stored in food, fuel and batteries", 0], ["nuclear energy", "the energy stored in the centre of atoms", 0], ["solar energy", "the energy that comes from the Sun", 0], ["joule", "the unit used to measure energy"], ["work", "the transfer of energy when a force moves an object", 0], ["energy source", "something that supplies energy"], ["battery", "a store of chemical energy that can power devices"], ["generator", "a machine that changes movement into electricity"], ["conservation of energy", "the rule that energy cannot be created or destroyed, only changed", 0]]
    });

    X("energy-transformation", "Energy transformation", {
        i: "Energy cannot be made or destroyed, but it can change from one form to another. This is energy transformation. Some energy is always wasted as heat.",
        r: "An electric fan changes electrical energy into movement. A torch changes chemical energy in its battery into light. A solar panel changes sunlight into electricity.",
        k: ["Bulb: electrical to light and heat.", "Radio: electrical to sound.", "Solar panel: light to electrical.", "Leaf: light to chemical energy in food."],
        e: ["What change takes place in an electric iron?", ["It gets hot.", "Electrical energy becomes heat."], "Electrical to heat"],
        d: D.flow("An energy chain", ["Sun (light energy)", "Green leaf makes food (chemical energy)", "Person eats and runs (movement and heat)"]),
        m: "Saying energy is lost. It is changed, and some becomes heat that we cannot use."
    }, {
        sets: [
            { style: "fact", ctx: "device", pairs: [["an electric bulb", "changes electrical energy into light and heat"], ["an electric fan", "changes electrical energy into movement"], ["a radio", "changes electrical energy into sound"], ["a solar panel", "changes sunlight into electrical energy"], ["a torch", "changes the chemical energy in its battery into light"], ["a candle", "changes the chemical energy in wax into heat and light"], ["a car engine", "changes the chemical energy in fuel into movement"], ["a hydroelectric power station", "uses the energy of falling water to make electricity"], ["a wind turbine", "uses the energy of moving air to make electricity"], ["an electric iron", "changes electrical energy into heat"], ["a microphone", "changes sound into electrical signals"], ["a green leaf", "changes light energy into chemical energy stored in food"], ["rubbing the hands together", "changes movement energy into heat"], ["a firework", "changes chemical energy into light, sound and heat"], ["a television", "changes electrical energy into light and sound"], ["a phone battery being charged", "stores electrical energy as chemical energy"]] },
            { pairs: [["energy transformation", "the change of energy from one form to another", 0], ["energy chain", "a diagram that shows how energy changes form"], ["useful energy", "the energy that does the job we want", 0], ["wasted energy", "energy that escapes, usually as heat that we do not need", 0], ["efficiency", "how much of the energy put in is turned into useful energy", 0], ["energy loss", "the escape of energy as heat or sound during a change", 0]] }
        ]
    });

    X("energy-sources", "Renewable and non-renewable sources", {
        i: "Renewable sources (sun, wind, water, biomass) are replaced naturally and will not run out. Non-renewable sources (crude oil, coal, natural gas) are used up and cannot be replaced soon.",
        r: "Nigeria produces crude oil in the Niger Delta. Kainji Dam makes hydroelectric power. Solar panels power many street lights.",
        k: ["Renewable: sun, wind, flowing water, biomass.", "Non-renewable: coal, oil, natural gas.", "Fossil fuels were formed from ancient plants and animals.", "Burning fossil fuels pollutes the air."],
        e: ["Is natural gas renewable?", ["It formed over millions of years.", "It cannot be replaced soon."], "No"],
        d: D.cards("Energy sources", [["Renewable", "sun, wind, water, biomass, tides"], ["Non-renewable", "crude oil, coal, natural gas"], ["In Nigeria", "oil, gas, hydro (Kainji), solar"]]),
        m: "Thinking wood is always renewable. It is renewable only if trees are replanted."
    }, {
        cats: { "renewable source of energy": ["the sun", "wind", "flowing water", "biomass", "tides", "heat from deep in the Earth"], "non-renewable source of energy": ["crude oil", "coal", "natural gas", "petrol", "diesel", "uranium"] },
        pairs: [["renewable energy", "energy from a source that is replaced naturally", 0], ["non-renewable energy", "energy from a source that will run out", 0], ["fossil fuel", "a fuel made from the remains of ancient plants and animals"], ["hydroelectric power", "electricity made from the energy of moving water", 0], ["solar power", "electricity or heat made from sunlight", 0], ["wind power", "electricity made from the energy of moving air", 0], ["biogas", "a gas made from rotting waste that can be burned"], ["biomass", "plant and animal material used as fuel", 0], ["crude oil", "a thick black oil found underground that is made into fuels", 0], ["coal", "a black rock made from ancient plants that is burned for energy", 0], ["natural gas", "a gas found with crude oil and used for cooking and power", 0], ["refinery", "a factory that turns crude oil into fuels"], ["power station", "a place where electricity is made on a large scale"], ["Kainji Dam", "a hydroelectric dam on the River Niger in Nigeria", 0], ["geothermal energy", "heat from deep inside the Earth", 0], ["tidal energy", "energy from the rise and fall of the sea tides", 0]]
    });

    X("heat-temperature", "Heat and temperature", {
        i: "Heat is a form of energy that moves from a hotter object to a cooler one. Temperature tells how hot or cold something is and is measured with a thermometer in degrees Celsius.",
        r: "A clinical thermometer is used to check body temperature. Normal body temperature is about 37 degrees Celsius.",
        k: ["Heat is energy; temperature is hotness.", "Water freezes at 0 and boils at 100 degrees Celsius.", "Normal body temperature is about 37 degrees Celsius.", "Sources of heat: the Sun, fire, electricity, friction."],
        e: ["Which instrument measures body temperature?", ["It must be small and accurate.", "A clinical thermometer."], "Clinical thermometer"],
        d: D.table("Temperatures to remember", ["Event", "Degrees Celsius"], [["Water freezes", "0"], ["Normal body", "about 37"], ["Water boils", "100"]]),
        m: "Mixing up heat and temperature. A bath of warm water holds more heat than a hot cup, but the cup may have a higher temperature."
    }, {
        mcq: [["Normal human body temperature is about:", "37 degrees Celsius", ["20 degrees Celsius", "50 degrees Celsius", "100 degrees Celsius"], "37 degrees Celsius is normal."], ["Water freezes at:", "0 degrees Celsius", ["10 degrees Celsius", "37 degrees Celsius", "100 degrees Celsius"], "Ice point."]],
        pairs: [["heat", "a form of energy that makes things hotter", 0], ["temperature", "how hot or cold something is", 0], ["thermometer", "an instrument for measuring temperature"], ["clinical thermometer", "a thermometer used to measure body temperature"], ["laboratory thermometer", "a thermometer used to measure the temperature of liquids in experiments"], ["degree Celsius", "the unit for measuring temperature"], ["normal body temperature", "about 37 degrees Celsius", 0], ["ice point", "the temperature at which pure ice melts, 0 degrees Celsius"], ["steam point", "the temperature at which pure water boils, 100 degrees Celsius"], ["heat source", "a thing that gives out heat"], ["friction", "the rubbing of two surfaces, which produces heat", 0], ["fever", "a body temperature higher than normal"], ["thermostat", "a switch that keeps a temperature steady"], ["mercury", "the silver liquid metal used in some thermometers", 0], ["alcohol thermometer", "a thermometer filled with coloured alcohol"], ["heat flow", "the movement of heat from a hot object to a cooler one", 0]]
    });

    X("heat-transfer", "Heat transfer", {
        i: "Heat travels in three ways: conduction through solids, convection through liquids and gases, and radiation as rays that need no material. Good conductors pass heat quickly; insulators do not.",
        r: "A metal spoon gets hot in a hot pot (conduction). Hot air rises above a fire (convection). We feel the Sun warmth through space (radiation).",
        k: ["Conduction: solids, particle to particle.", "Convection: fluids, warm rises and cool sinks.", "Radiation: needs no material.", "Shiny surfaces reflect heat; dark surfaces absorb it."],
        e: ["How does the Sun heat the Earth?", ["There is empty space between them.", "Only rays can cross space."], "By radiation"],
        d: D.table("Three ways heat travels", ["Way", "Where"], [["Conduction", "solids"], ["Convection", "liquids and gases"], ["Radiation", "through empty space"]]),
        m: "Saying heat rises. Hot air and hot water rise because they are lighter; heat itself moves from hot to cold."
    }, {
        cats: { "good conductor of heat": ["iron", "copper", "aluminium", "silver", "steel"], "good insulator of heat": ["wood", "plastic", "cloth", "air", "rubber", "cork"] },
        pairs: [["conduction", "the movement of heat through a solid from particle to particle", 0], ["convection", "the movement of heat through liquids and gases by rising warm currents", 0], ["radiation", "the movement of heat as rays that need no material", 0], ["conductor of heat", "a material that lets heat pass through easily"], ["insulator of heat", "a material that does not let heat pass through easily"], ["convection current", "the circular movement of warm fluid rising and cool fluid sinking"], ["vacuum flask", "a flask that keeps drinks hot or cold by stopping heat transfer"], ["sea breeze", "a cool wind that blows from the sea to the land during the day"], ["land breeze", "a wind that blows from the land to the sea at night"], ["shiny surface", "a surface that reflects heat radiation"], ["dark surface", "a surface that absorbs more heat radiation"], ["lagging", "a material wrapped around a pipe or tank to keep the heat in", 0], ["chimney", "a tall pipe that lets hot smoke rise out of a building"], ["heat transfer", "the movement of heat from one place to another", 0], ["pot handle", "a part made of wood or plastic so that it does not get hot"], ["thermal conductivity", "how well a material lets heat pass through it", 0]]
    });

    X("expansion-contraction", "Expansion and contraction", {
        i: "Most materials expand (get bigger) when heated and contract (get smaller) when cooled. Gases expand most, liquids less and solids least.",
        r: "Railway lines have small gaps so they do not bend in hot weather. Mercury rises in a thermometer because it expands.",
        k: ["Heat makes particles move more, so the material expands.", "Cooling makes it contract.", "Gaps and joints allow for expansion.", "Water is unusual: it expands when it freezes."],
        e: ["Why are gaps left in railway lines?", ["Rails get hot in the Sun.", "Hot metal expands."], "To allow the metal to expand"],
        d: D.cards("Expansion in daily life", [["Railway gaps", "allow rails to expand"], ["Thermometer", "liquid expands and rises"], ["Cables", "sag in the heat"], ["Jar lid", "loosens in hot water"]]),
        m: "Thinking a solid does not expand because it looks the same. The change is small but real."
    }, {
        mcq: [["Which expands most when heated?", "A gas", ["A solid", "A liquid", "They all expand equally"], "Gas particles are far apart and move freely."]],
        sets: [
            { style: "fact", ctx: "thing", pairs: [["a metal rod", "gets longer when heated"], ["a railway line", "is laid with small gaps so that it does not bend in hot weather"], ["an overhead cable", "sags more on a hot day because it expands"], ["mercury in a thermometer", "rises when heated because it expands"], ["a heated metal ball", "no longer fits through the ring it fitted before"], ["a tight metal lid on a jar", "loosens when held under hot water"], ["a balloon left in the hot sun", "may burst because the air inside expands"], ["a concrete bridge", "has expansion joints to allow for expansion"], ["a heated gas", "expands more than a heated solid"], ["water", "expands when it freezes"], ["a cold glass poured with boiling water", "may crack because it expands unevenly"], ["a hot air balloon", "rises because the heated air inside expands and becomes lighter"], ["a tarred road", "may form bumps in the hot sun because it expands"], ["a wire stretched tight in cold weather", "may snap because it contracts"]] },
            { pairs: [["expansion", "the increase in size of a material when it is heated", 0], ["contraction", "the decrease in size of a material when it is cooled", 0], ["expansion joint", "a small gap left between parts to allow for expansion"], ["bimetallic strip", "a strip of two metals that bends when heated"], ["thermostat", "a switch that turns heating on or off at a set temperature"], ["sag", "to hang lower in the middle"], ["buckle", "to bend out of shape because of heat or pressure"], ["thermal expansion", "the growing of a material caused by heat", 0]] }
        ]
    });

    X("light-sources", "Sources and properties of light", {
        i: "Light is a form of energy that lets us see. Luminous objects make their own light; non-luminous objects only reflect it. Light travels in straight lines and very fast.",
        r: "The Sun, a candle flame and a firefly are luminous. The Moon is non-luminous: it reflects sunlight.",
        k: ["Luminous: Sun, stars, bulb, candle.", "Non-luminous: Moon, book, mirror.", "Light travels in straight lines at about 300,000 km per second.", "Transparent, translucent and opaque materials."],
        e: ["Why can we see the Moon?", ["The Moon makes no light.", "It reflects sunlight."], "It reflects light from the Sun"],
        d: D.cards("Light and materials", [["Luminous", "makes its own light (Sun, bulb)"], ["Non-luminous", "reflects light (Moon, book)"], ["Transparent", "clear: glass"], ["Opaque", "blocks light: wood"]]),
        m: "Thinking the Moon is a source of light. It only reflects the light of the Sun."
    }, {
        cats: { "luminous object": ["the Sun", "a candle flame", "an electric bulb", "a firefly", "lightning", "a lit torch", "a star"], "non-luminous object": ["the Moon", "a book", "a table", "a mirror", "a stone", "a wooden door"] },
        pairs: [["luminous object", "an object that makes its own light"], ["non-luminous object", "an object that does not make its own light"], ["ray", "a straight line showing the path of light"], ["beam", "a group of light rays travelling together"], ["natural source of light", "a source of light found in nature, such as the Sun"], ["artificial source of light", "a source of light made by people, such as a bulb"], ["transparent material", "a material that lets light pass through so we can see clearly"], ["translucent material", "a material that lets some light through but not a clear picture"], ["opaque material", "a material that does not let any light pass through"], ["speed of light", "about 300,000 kilometres per second", 0], ["laser", "a very narrow and strong beam of light"], ["visible light", "light that our eyes can see", 0], ["bioluminescence", "light made by living things such as fireflies", 0], ["light", "a form of energy that lets us see", 0], ["LED", "a small lamp that uses very little electricity"], ["torch", "a handheld lamp powered by batteries"]]
    });

    X("reflection-mirrors", "Reflection and mirrors", {
        i: "Reflection is the bouncing of light off a surface. A smooth shiny surface such as a plane mirror gives regular reflection. The angle of incidence equals the angle of reflection.",
        r: "You see yourself in a mirror. A convex rear-view mirror on a vehicle gives a wide view of the road. A periscope uses two mirrors to see over a wall.",
        k: ["Law of reflection: angle i = angle r.", "Plane mirror image is the same size, reversed left to right.", "Concave mirrors curve inwards; convex mirrors curve outwards.", "Rough surfaces scatter light (diffuse reflection)."],
        e: ["A ray hits a mirror at an angle of incidence of 40 degrees. What is the angle of reflection?", ["The two angles are equal.", "So the reflected angle is also 40."], "40 degrees"],
        d: D2.reflect(),
        m: "Measuring the angles from the mirror surface. Both angles are measured from the normal."
    }, {
        gens: [function (r) { var a = 5 * ri(r, 1, 17); return numQ(r, 'A ray of light hits a plane mirror with an angle of incidence of ' + a + ' degrees. What is the angle of reflection?', a, [90 - a, 2 * a, 180 - a], 'degrees', 'The angle of reflection equals the angle of incidence.', 'ang' + a); }, function (r) { var a = 5 * ri(r, 1, 17); return numQ(r, 'A ray makes an angle of ' + a + ' degrees with the normal at a mirror. What angle does the reflected ray make with the normal?', a, [90 - a, 2 * a, a + 10], 'degrees', 'Angle i = angle r, so the answer is ' + a + ' degrees.', 'ang2' + a); }],
        pairs: [["reflection", "the bouncing of light off a surface", 0], ["incident ray", "the ray of light that hits a surface"], ["reflected ray", "the ray of light that bounces off a surface"], ["normal", "an imaginary line at right angles to a surface"], ["angle of incidence", "the angle between the incident ray and the normal"], ["angle of reflection", "the angle between the reflected ray and the normal"], ["plane mirror", "a flat mirror that gives an image the same size as the object"], ["concave mirror", "a mirror that curves inwards like the inside of a spoon"], ["convex mirror", "a mirror that curves outwards like the back of a spoon"], ["periscope", "a tube with two mirrors that lets us see over obstacles"], ["lateral inversion", "the left-right reversal of an image in a mirror", 0], ["regular reflection", "reflection from a smooth surface in one direction", 0], ["diffuse reflection", "reflection from a rough surface in many directions", 0], ["rear-view mirror", "a convex mirror on a vehicle that gives a wide view behind"], ["cat's eye reflector", "a device on a road that reflects car headlights"], ["law of reflection", "the rule that the angle of incidence equals the angle of reflection", 0]]
    });

    X("shadows-pinhole", "Shadows and the pinhole camera", {
        i: "A shadow forms when an opaque object blocks light. Light travels in straight lines, so shadows have the shape of the object. A pinhole camera makes an upside-down image on a screen.",
        r: "Your shadow is long in the early morning and short at noon. A sundial tells time by the movement of a shadow.",
        k: ["Shadows need a light source, an opaque object and a screen.", "Closer to the light: bigger shadow.", "Shadow is shortest at noon.", "Pinhole camera image is upside down."],
        e: ["Why is a shadow shortest at noon?", ["The Sun is highest.", "Light comes from nearly overhead."], "The Sun is highest in the sky"],
        d: D.flow("How a shadow forms", ["Light source sends out rays", "Opaque object blocks the rays", "A dark shadow forms on the screen"]),
        m: "Thinking a shadow is a reflection. It is the absence of light."
    }, {
        sets: [
            { style: "fact", ctx: "thing", pairs: [["a shadow at noon", "is the shortest of the day"], ["a shadow in the early morning", "is long and points west"], ["a shadow in the late afternoon", "is long and points east"], ["an object close to the light source", "casts a large shadow"], ["an object far from the light source", "casts a small shadow"], ["a transparent object", "casts almost no shadow"], ["an opaque object", "casts a dark shadow"], ["a translucent object", "casts a faint shadow"], ["a pinhole camera", "makes an upside-down image"], ["a smaller pinhole", "makes a sharper but dimmer image"], ["a sundial", "tells the time using the movement of a shadow"]] },
            { pairs: [["shadow", "a dark area formed when an opaque object blocks light"], ["umbra", "the darkest part of a shadow"], ["penumbra", "the lighter edge of a shadow"], ["pinhole camera", "a box with a tiny hole that makes an upside-down image"], ["image", "a picture formed by light"], ["inverted image", "an image that is upside down"], ["screen", "a surface on which a shadow or an image falls"], ["obstacle", "an object that blocks the path of light"], ["sundial", "a clock that tells the time by the shadow of a stick"], ["light source", "a thing that gives out light"]] }
        ]
    });

    X("colours-rainbow", "Colours and the rainbow", {
        i: "White light is a mixture of seven colours: red, orange, yellow, green, blue, indigo and violet. A prism or raindrops can split white light into this spectrum (dispersion).",
        r: "A rainbow appears when the Sun shines through rain. A red cloth looks red because it reflects red light and absorbs the others.",
        k: ["Spectrum order: ROYGBIV.", "Dispersion: splitting of white light.", "Primary colours of light: red, green, blue.", "A white object reflects all colours; a black object absorbs them."],
        e: ["Why does a green leaf look green?", ["It reflects some colours.", "It reflects green light and absorbs others."], "It reflects green light"],
        d: D2.prism(),
        m: "Thinking a rainbow is an object in the sky. It is an effect of light and raindrops."
    }, {
        sets: [
            { style: "fact", ctx: "thing", pairs: [["a red object", "reflects red light and absorbs the other colours"], ["a white object", "reflects all colours of light"], ["a black object", "absorbs nearly all light"], ["a green leaf", "looks green because it reflects green light"], ["a blue filter", "lets only blue light pass through"], ["a prism", "splits white light into seven colours"], ["a raindrop", "acts like a tiny prism in a rainbow"], ["a rainbow", "is seen when the Sun shines while it rains"]] },
            { pairs: [["spectrum", "the band of seven colours made when white light is split"], ["dispersion", "the splitting of white light into its colours", 0], ["prism", "a triangular glass block that splits white light"], ["rainbow", "an arc of colours in the sky seen when sunlight passes through raindrops"], ["white light", "a mixture of all the colours of light", 0], ["primary colour of light", "one of red, green and blue light"], ["filter", "a coloured sheet that lets only its own colour of light pass"], ["red", "the colour on the outer edge of a rainbow", 0], ["violet", "the colour on the inner edge of a rainbow", 0], ["Isaac Newton", "the scientist who split sunlight with a prism", 0], ["refraction", "the bending of light as it passes from one material to another", 0], ["colour blindness", "difficulty in telling some colours apart", 0]] }
        ]
    });

    X("sound-production", "Production and travel of sound", {
        i: "Sound is made when things vibrate (move quickly back and forth). It travels as waves through solids, liquids and gases, but not through a vacuum. It travels fastest in solids.",
        r: "A drum makes sound when you hit it and its skin vibrates. You see lightning before you hear thunder because light travels faster than sound.",
        k: ["Vibration makes sound.", "Sound needs a material (medium).", "Speed in air is about 340 metres per second.", "Sound is fastest in solids, then liquids, then gases."],
        e: ["Can sound travel in space?", ["Space is a vacuum.", "There are no particles to carry the waves."], "No"],
        d: D.flow("How sound reaches your ear", ["Object vibrates", "Vibrations pass through the air as sound waves", "Waves reach the ear", "The brain hears the sound"]),
        m: "Thinking sound travels faster than light. Light is far faster."
    }, {
        gens: [function (r) { var t = ri(r, 1, 10); return numQ(r, 'Thunder is heard ' + t + ' seconds after lightning is seen. Taking the speed of sound as 340 m/s, how far away is the storm?', 340 * t, [340 * t + 340, 34 * t, 340 + t], 'm', 'Distance = speed x time = 340 x ' + t + ' = ' + (340 * t) + ' m.', 'thun' + t); }],
        sets: [
            { style: "fact", ctx: "thing", pairs: [["sound", "needs a material to travel through"], ["sound in a vacuum", "cannot travel because there are no particles"], ["sound in air", "travels at about 340 metres per second"], ["sound in solids", "travels faster than sound in gases"], ["light", "travels much faster than sound"], ["a guitar", "makes sound when its stretched strings are plucked"], ["a drum", "makes a sound when its stretched skin is hit"], ["the human voice", "is made by the vocal cords vibrating"], ["a tuning fork", "gives out a pure steady note when struck"], ["a bell", "rings when its metal body is struck"], ["a string telephone", "carries sound along a tight string"], ["a sonar device", "uses sound to find objects under water"]] },
            { pairs: [["sound", "a form of energy made by vibrations that we hear", 0], ["vibration", "a fast back-and-forth movement"], ["sound wave", "a wave of vibrating particles that carries sound"], ["medium", "a material that sound travels through"], ["vacuum", "a space with no particles in it"], ["speed of sound", "about 340 metres per second in air", 0], ["thunder", "the sound made when lightning heats the air suddenly", 0], ["eardrum", "a thin skin in the ear that vibrates when sound reaches it"]] }
        ]
    });

    X("pitch-loudness-echo", "Pitch, loudness and echo", {
        i: "Pitch is how high or low a sound is; it depends on the frequency of vibration. Loudness is how strong a sound is; it depends on the size (amplitude) of vibration. An echo is sound reflected from a hard surface.",
        r: "A mosquito whines at a high pitch; a lion roars at a low pitch. You can hear an echo in an empty hall or near a cliff.",
        k: ["Fast vibration: high pitch.", "Big vibration: loud sound.", "Loudness is measured in decibels.", "Echo needs a hard surface far enough away."],
        e: ["A boy hears an echo after 2 seconds. The speed of sound is 340 m/s. How far is the wall?", ["Sound goes to the wall and back.", "Distance = 340 x 2 / 2 = 340 m."], "340 m"],
        d: D.cards("Pitch and loudness", [["Pitch", "high or low; frequency"], ["Loudness", "strong or soft; amplitude"], ["Echo", "reflected sound"], ["Noise", "unwanted loud sound"]]),
        m: "Mixing up pitch and loudness. A high sound can be quiet, and a low sound can be loud."
    }, {
        gens: [function (r) { var t = P(r, [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 2, 2.4, 3]); var d = 340 * t / 2; return numQ(r, 'A girl shouts and hears an echo after ' + t + ' seconds. Taking the speed of sound as 340 m/s, how far is the wall?', d, [340 * t, d * 2 + 34, d + 34], 'm', 'The sound goes there and back, so distance = 340 x ' + t + ' / 2 = ' + fmt(d) + ' m.', 'echo' + t); }],
        sets: [
            { style: "fact", ctx: "thing", pairs: [["a thin guitar string", "gives a higher note than a thick one"], ["a short string", "gives a higher note than a long one"], ["a tightly stretched string", "gives a higher note than a loose one"], ["a big drum", "gives a lower note than a small drum"], ["a child voice", "usually has a higher pitch than an adult voice"], ["a mosquito", "makes a high-pitched whine"], ["the roar of a lion", "is a low-pitched sound"], ["a large vibration", "gives a loud sound"]] },
            { pairs: [["pitch", "how high or low a sound is", 0], ["loudness", "how strong or soft a sound is", 0], ["frequency", "the number of vibrations in one second", 0], ["hertz", "the unit of frequency"], ["amplitude", "the size of a vibration", 0], ["decibel", "the unit used to measure the loudness of sound"], ["echo", "a sound heard again after it bounces off a hard surface"], ["noise", "an unwanted loud sound", 0], ["noise pollution", "harmful or annoying loud sound in the environment", 0], ["soundproofing", "covering walls to stop sound passing through", 0], ["ultrasound", "sound too high for humans to hear", 0], ["infrasound", "sound too low for humans to hear", 0], ["ear muff", "a cover that protects the ears from loud noise"], ["musical note", "a sound with a steady pitch"]] }
        ]
    });

    X("saving-energy", "Saving energy at home", {
        i: "Saving energy means using less of it and wasting none. It saves money and reduces pollution. We save energy by switching off unused lights, using LED bulbs, unplugging chargers and using natural light.",
        r: "Switch off the TV when nobody is watching. Cook with a lid on the pot. Use an LED bulb instead of an old bulb.",
        k: ["Switch off what you are not using.", "Use energy-saving (LED) bulbs.", "Insulate and keep fridge doors shut.", "Use renewable energy like solar."],
        e: ["Why use an LED bulb?", ["It makes light.", "It uses much less electricity for the same light."], "It uses less electricity"],
        d: D.cards("Ways to save energy", [["Lights", "switch off; use LED bulbs"], ["Kitchen", "cook with a lid; shut the fridge"], ["Appliances", "unplug chargers; avoid standby"], ["Travel", "walk or share rides"]]),
        m: "Thinking a device on standby uses no power. It still uses a little."
    }, {
        cats: { "way of saving energy": ["switching off unused lights", "using LED bulbs", "unplugging unused chargers", "using natural light", "shutting the fridge door quickly", "cooking with a lid on the pot"], "way of wasting energy": ["leaving lights on in an empty room", "keeping the fridge door open", "leaving the TV on standby", "boiling more water than needed", "using a car for a short walk", "leaving a phone charger plugged in all day"] },
        pairs: [["energy conservation", "using less energy and wasting none", 0], ["LED bulb", "a bulb that gives good light and uses very little electricity"], ["switching off", "turning off a device when it is not in use", 0], ["insulation", "a covering that stops heat from escaping"], ["solar water heater", "a device that uses sunlight to heat water"], ["appliance", "an electrical device used at home"], ["standby mode", "a state in which a device is off but still uses a little power", 0], ["energy label", "a sticker that shows how much energy an appliance uses"], ["efficiency", "how much of the energy put in is turned into useful energy", 0], ["wasted energy", "energy that escapes without doing useful work", 0], ["public transport", "buses and trains that carry many people at once", 0], ["carpooling", "sharing a car with others to save fuel", 0], ["natural lighting", "using daylight instead of lamps", 0], ["energy audit", "a check of how much energy a home or school uses"], ["inverter", "a device that stores electricity and supplies it when the power is off"], ["generator", "a machine that makes electricity but burns fuel and gives out smoke and noise"]]
    });
})(typeof window !== 'undefined' ? window : globalThis);

(function (root) {
    if (!root.CMLearnBst) return;
    var h = root.CMLearnBst.h, X = h.X, S = h.S, D = h.D, D2 = h.D2, numQ = h.numQ, fmt = h.fmt, P = h.P, ri = h.ri;
    S("Forces, Motion and Simple Machines");

    X("force-effects", "Force and its effects", {
        i: "A force is a push or a pull. It is measured in newtons (N) with a spring balance. A force can start or stop motion, change speed or direction, and change the shape of an object.",
        r: "You push a wheelbarrow, pull a bucket from a well and stretch a rubber band. Each is a force.",
        k: ["Force = push or pull; unit newton (N).", "Contact forces touch; non-contact forces (gravity, magnetism) act at a distance.", "Balanced forces: no change in motion.", "Unbalanced forces change motion."],
        e: ["What is the unit of force?", ["It is named after Isaac Newton.", "The newton."], "Newton"],
        d: D.cards("Effects of a force", [["Start or stop", "kicking a ball, braking"], ["Speed up or slow down", "pedalling, braking"], ["Change direction", "a footballer turns the ball"], ["Change shape", "squeezing clay"]]),
        m: "Thinking a moving object always needs a force to keep it moving. It keeps moving unless friction or another force stops it."
    }, {
        cats: { "push": ["kicking a ball", "pushing a wheelbarrow", "closing a door", "pressing a bell", "hammering a nail", "pushing a swing"], "pull": ["opening a drawer", "pulling a rope", "drawing water from a well", "tugging a cart", "stretching a rubber band", "dragging a mat"] },
        pairs: [["force", "a push or a pull", 0], ["newton", "the unit of force"], ["balanced forces", "forces that are equal and opposite so the motion does not change", 0], ["unbalanced forces", "forces that are not equal and so change the motion", 0], ["contact force", "a force that acts only when objects touch"], ["non-contact force", "a force that acts without touching"], ["spring balance", "an instrument for measuring force"], ["push", "a force that moves an object away from us"], ["pull", "a force that moves an object towards us"], ["muscular force", "the force produced by the muscles of a person or animal", 0], ["magnetic force", "the force of attraction or repulsion between magnets", 0], ["electrostatic force", "the force between charged objects", 0], ["air resistance", "the force of air pushing against a moving object", 0], ["tension", "the pulling force in a stretched rope or string", 0], ["thrust", "a forward pushing force that moves a rocket or aeroplane", 0], ["inertia", "the tendency of an object to stay at rest or keep moving", 0]]
    });

    X("friction", "Friction", {
        i: "Friction is a force that opposes motion between two surfaces in contact. Rough surfaces cause more friction. Friction makes heat and causes wear. Oil and grease (lubricants) reduce friction.",
        r: "A tyre grips the road because of friction. A squeaky door hinge is cured with oil. Rubbing your hands makes them warm.",
        k: ["Friction acts opposite to motion.", "Useful: walking, brakes, writing, striking a match.", "Harmful: wear, heat, wasted energy.", "Reduce with oil, ball bearings, smooth shapes."],
        e: ["Why do we put oil on a bicycle chain?", ["Moving metal parts rub.", "Oil reduces friction."], "To reduce friction"],
        d: D.table("Friction", ["Useful", "Harmful"], [["walking", "worn shoe soles"], ["brakes", "hot engines"], ["striking a match", "squeaky hinges"]]),
        m: "Thinking friction is always bad. We could not walk, write or brake without it."
    }, {
        cats: { "situation where friction is useful": ["walking on the road", "a brake stopping a bicycle", "striking a match", "a pencil writing on paper", "a tyre gripping the road", "rubbing hands to get warm"], "situation where friction is a problem": ["shoes wearing out", "machine parts wearing out", "a heated car engine", "a stiff door hinge", "a rope burning the hand"] },
        pairs: [["friction", "the force that opposes motion between two surfaces in contact", 0], ["lubricant", "a substance such as oil that reduces friction"], ["lubrication", "the use of oil or grease to reduce friction", 0], ["grip", "the hold that a surface has on another because of friction", 0], ["rough surface", "a surface with bumps that causes more friction"], ["smooth surface", "a surface that causes little friction"], ["air resistance", "the friction of air against a moving object", 0], ["water resistance", "the friction of water against a moving object", 0], ["streamlined shape", "a smooth shape that reduces air or water resistance"], ["brake", "a part that uses friction to slow or stop a wheel"], ["ball bearing", "small steel balls that reduce friction in moving parts"], ["wear and tear", "damage to surfaces caused by friction", 0], ["sliding friction", "friction when one surface slides over another", 0], ["rolling friction", "friction when a wheel rolls over a surface, which is less than sliding friction", 0], ["static friction", "the friction that stops an object from starting to move", 0], ["tyre tread", "the grooves on a tyre that grip the road"]]
    });

    X("gravity-mass-weight", "Gravity, mass and weight", {
        i: "Gravity is the force that pulls objects towards the Earth. Mass is the amount of matter in an object (kilograms). Weight is the pull of gravity on an object (newtons). Weight = mass x 10 on Earth.",
        r: "A mango falls from a tree because of gravity. A 5 kg bag of rice weighs about 50 newtons.",
        k: ["Mass is the same everywhere; weight changes with gravity.", "Mass is measured with a beam balance; weight with a spring balance.", "The Moon gravity is about one sixth of Earth.", "In space astronauts feel weightless."],
        e: ["What is the weight of a 3 kg object on Earth? (g = 10 N/kg)", ["Weight = mass x 10.", "3 x 10 = 30."], "30 N"],
        d: D.table("Mass and weight", ["", "Mass", "Weight"], [["Meaning", "amount of matter", "pull of gravity"], ["Unit", "kilogram", "newton"], ["Tool", "beam balance", "spring balance"], ["On the Moon", "same", "less"]]),
        m: "Using the words mass and weight as if they were the same. Mass is in kilograms; weight is a force in newtons."
    }, {
        gens: [function (r) { var m = ri(r, 1, 60); return numQ(r, 'A bag has a mass of ' + m + ' kg. What is its weight on Earth? (Take g = 10 N/kg)', m * 10, [m, m * 100, m * 10 + 10], 'N', 'Weight = mass x 10 = ' + m + ' x 10 = ' + (m * 10) + ' N.', 'wt' + m); }, function (r) { var w = 10 * ri(r, 1, 80); return numQ(r, 'An object weighs ' + w + ' N on Earth. What is its mass? (Take g = 10 N/kg)', w / 10, [w, w * 10, w / 10 + 10], 'kg', 'Mass = weight / 10 = ' + w + ' / 10 = ' + (w / 10) + ' kg.', 'ms' + w); }],
        pairs: [["gravity", "the force that pulls objects towards the Earth", 0], ["mass", "the amount of matter in an object", 0], ["weight", "the pull of gravity on an object", 0], ["kilogram", "the unit of mass"], ["newton", "the unit of weight and force"], ["free fall", "the fall of an object when gravity is the only force on it", 0], ["weightlessness", "the feeling of having no weight, as in space", 0], ["beam balance", "an instrument for measuring mass"], ["spring balance", "an instrument for measuring weight"], ["Isaac Newton", "the scientist linked with the discovery of gravity", 0], ["centre of gravity", "the point where all the weight of an object seems to act"], ["parachute", "a canopy that uses air resistance to slow a fall"], ["gram", "a small unit of mass, one thousandth of a kilogram"], ["stable object", "an object with a low centre of gravity and a wide base"], ["orbit", "the curved path of one body around another in space"], ["gravitational pull", "the force with which a large body such as the Earth attracts other things", 0]]
    });

    X("motion-speed", "Motion and speed", {
        i: "Motion is a change in position. Speed is how fast something moves: speed = distance / time. It is measured in metres per second (m/s) or kilometres per hour (km/h).",
        r: "A bus covers 120 km in 2 hours, so its speed is 60 km/h. The speedometer shows the speed of a car.",
        k: ["Speed = distance / time.", "Distance = speed x time.", "Time = distance / speed.", "Acceleration: speeding up; deceleration: slowing down."],
        e: ["A car travels 150 km in 3 hours. What is its speed?", ["Speed = distance / time.", "150 / 3 = 50."], "50 km/h"],
        d: D.flow("The speed triangle", ["Speed = distance / time", "Distance = speed x time", "Time = distance / speed"]),
        m: "Dividing time by distance. Speed is distance divided by time."
    }, {
        gens: [function (r) { var s = P(r, [20, 30, 40, 50, 60, 70, 80, 90, 100, 120]), t = ri(r, 1, 5), d = s * t; return numQ(r, 'A car travels ' + d + ' km in ' + t + (t === 1 ? ' hour' : ' hours') + '. What is its average speed?', s, [d + t, d * t, s + 10], 'km/h', 'Speed = distance / time = ' + d + ' / ' + t + ' = ' + s + ' km/h.', 'sp' + s + ':' + t); }, function (r) { var s = P(r, [20, 30, 40, 50, 60, 70, 80, 90, 100, 120]), t = ri(r, 1, 5); return numQ(r, 'A bus moves at ' + s + ' km/h for ' + t + (t === 1 ? ' hour' : ' hours') + '. How far does it travel?', s * t, [s + t, s / t + 10, s * t + s], 'km', 'Distance = speed x time = ' + s + ' x ' + t + ' = ' + (s * t) + ' km.', 'ds' + s + ':' + t); }, function (r) { var s = P(r, [2, 4, 5, 10, 20]), t = P(r, [3, 5, 8, 10, 15, 20, 25, 30]); return numQ(r, 'A runner covers ' + (s * t) + ' m at a steady ' + s + ' m/s. How long does the run take?', t, [s * t, t + 5, t * 2], 's', 'Time = distance / speed = ' + (s * t) + ' / ' + s + ' = ' + t + ' s.', 'tm' + s + ':' + t); }],
        pairs: [["motion", "a change in position", 0], ["speed", "the distance covered in a unit of time", 0], ["velocity", "speed in a given direction", 0], ["distance", "how far an object has moved", 0], ["time", "how long an event takes", 0], ["average speed", "the total distance divided by the total time", 0], ["acceleration", "the rate at which speed increases", 0], ["deceleration", "the rate at which speed decreases", 0], ["speedometer", "an instrument that shows the speed of a vehicle"], ["stopwatch", "an instrument for measuring short times"], ["at rest", "not moving", 0], ["uniform speed", "a speed that stays the same all the time", 0], ["metre per second", "a unit of speed written m/s"], ["kilometre per hour", "a unit of speed written km/h"], ["speed limit", "the highest speed allowed on a road"], ["seat belt", "a strap that holds a passenger in place during a sudden stop"]]
    });

    X("pressure", "Pressure", {
        i: "Pressure is the force acting on each unit of area: pressure = force / area. The same force on a small area gives a large pressure. Liquids and gases also exert pressure.",
        r: "A sharp knife cuts easily because its edge has a small area. A tractor has wide tyres so it does not sink in soft ground.",
        k: ["Pressure = force / area.", "Smaller area: more pressure.", "Water pressure increases with depth.", "Air pressure falls as we go up."],
        e: ["A force of 100 N acts on 5 square metres. What is the pressure?", ["Pressure = force / area.", "100 / 5 = 20."], "20 N/m2"],
        d: D.table("Pressure", ["Idea", "Example"], [["Small area, big pressure", "sharp knife, pin"], ["Big area, small pressure", "wide tyre, snow shoe"], ["Depth", "dam wall thicker at the bottom"]]),
        m: "Thinking a heavier object always exerts more pressure. The area matters too."
    }, {
        gens: [function (r) { var a = P(r, [2, 4, 5, 10]), p = P(r, [10, 20, 25, 50, 100, 200]), f = a * p; return numQ(r, 'A force of ' + f + ' N acts on an area of ' + a + ' square metres. What is the pressure?', p, [f + a, f * a, p + 10], 'N/m2', 'Pressure = force / area = ' + f + ' / ' + a + ' = ' + p + ' N/m2.', 'pr' + a + ':' + p); }, function (r) { var a = P(r, [2, 4, 5, 10]), p = P(r, [10, 20, 25, 50, 100, 200]); return numQ(r, 'The pressure on a surface is ' + p + ' N/m2 and its area is ' + a + ' square metres. What is the force?', p * a, [p + a, p / a + 10, p * a + p], 'N', 'Force = pressure x area = ' + p + ' x ' + a + ' = ' + (p * a) + ' N.', 'fo' + a + ':' + p); }],
        sets: [
            { style: "fact", ctx: "thing", pairs: [["a sharp knife", "cuts easily because it has a small area of contact"], ["a wide tractor tyre", "does not sink in soft ground because it spreads the weight over a large area"], ["a high-heeled shoe", "sinks into soft ground because the weight is on a small area"], ["a camel foot", "is wide so that it does not sink in sand"], ["a dam wall", "is thicker at the bottom because water pressure is greater deep down"], ["a deep-sea diver", "feels more pressure the deeper he goes"], ["a drawing pin", "has a sharp point to give a high pressure"], ["a bed of nails", "can be lain on safely because the weight is shared by many nails"], ["air pressure", "becomes lower as we go up a mountain"], ["a vacuum cleaner", "pulls in dust by making a low pressure inside"], ["a drinking straw", "works because air pressure pushes the drink up"], ["a hydraulic jack", "lifts heavy loads using pressure in a liquid"]] },
            { pairs: [["pressure", "the force acting on each unit of area", 0], ["pascal", "the unit of pressure"], ["area", "the amount of surface that something covers", 0], ["atmospheric pressure", "the pressure of the air on the Earth", 0], ["water pressure", "the pressure of water, which increases with depth", 0], ["suction", "the pulling effect caused by lower air pressure", 0]] }
        ]
    });

    X("floating-sinking", "Floating and sinking", {
        i: "An object floats when the upthrust of the water equals its weight. Objects less dense than water float; denser objects sink. A ship floats because its hollow shape displaces a lot of water.",
        r: "A cork floats but a stone sinks. A big steel ship floats, while a small steel nail sinks. A life jacket helps a swimmer float.",
        k: ["Upthrust pushes upwards on objects in a liquid.", "Less dense than water: floats.", "Salt water is denser, so floating is easier.", "Archimedes studied displacement."],
        e: ["Why does a steel ship float?", ["It is hollow.", "It pushes aside a lot of water."], "Its shape displaces enough water"],
        d: D.table("Float or sink?", ["Floats", "Sinks"], [["cork", "stone"], ["wood", "iron nail"], ["empty bottle", "coin"], ["ice", "marble"]]),
        m: "Thinking heavy things always sink. A huge ship floats."
    }, {
        cats: { "object that floats on water": ["cork", "wooden spoon", "empty plastic bottle", "ice cube", "dry leaf", "candle"], "object that sinks in water": ["stone", "iron nail", "coin", "metal spoon", "marble", "brick"] },
        pairs: [["buoyancy", "the ability to float", 0], ["upthrust", "the upward push of a liquid on an object in it", 0], ["density", "how heavy a material is for its size", 0], ["floating", "staying on the surface of a liquid", 0], ["sinking", "going down to the bottom of a liquid", 0], ["displacement", "the pushing aside of a liquid by an object placed in it", 0], ["Archimedes", "the Greek scientist who studied floating and displacement", 0], ["hydrometer", "an instrument for measuring the density of a liquid"], ["submarine", "a ship that can float or sink by changing the water in its tanks"], ["life jacket", "a jacket that helps a person to float"], ["ship", "a large hollow vessel that floats by displacing much water"], ["Plimsoll line", "a mark on a ship that shows how far it may be loaded"], ["overflow can", "a container used to collect the water displaced by an object"], ["ballast tank", "a tank in a submarine that is filled with water to make it sink"], ["raft", "a flat floating platform made of wood or other light material"], ["canoe", "a narrow boat moved by paddles"]]
    });

    X("work", "Work", {
        i: "In science, work is done when a force moves an object. Work = force x distance, measured in joules. Power is the rate of doing work: power = work / time, measured in watts.",
        r: "Carrying a bucket of water 10 m up some steps is work. Pushing a wall that does not move is no work in science.",
        k: ["Work (J) = force (N) x distance (m).", "No movement means no work.", "Power (W) = work (J) / time (s).", "A machine makes work easier, not smaller."],
        e: ["A force of 20 N moves a box 5 m. How much work is done?", ["Work = force x distance.", "20 x 5 = 100."], "100 J"],
        d: D.flow("Work and power", ["Work = force x distance (joules)", "Power = work / time (watts)", "No movement: no work done"]),
        m: "Saying work is done when you push a wall and get tired. The wall does not move, so no work is done."
    }, {
        gens: [function (r) { var f = P(r, [10, 20, 30, 40, 50, 100]), d = P(r, [2, 3, 4, 5, 10]); return numQ(r, 'A force of ' + f + ' N moves a box through ' + d + ' m. How much work is done?', f * d, [f + d, f * d + 10, f / d + 10], 'J', 'Work = force x distance = ' + f + ' x ' + d + ' = ' + (f * d) + ' J.', 'wk' + f + ':' + d); }, function (r) { var p = P(r, [10, 20, 50, 100, 200]), t = P(r, [2, 5, 10, 20]); return numQ(r, 'A machine does ' + (p * t) + ' J of work in ' + t + ' seconds. What is its power?', p, [p * t, p + t, p + 10], 'W', 'Power = work / time = ' + (p * t) + ' / ' + t + ' = ' + p + ' W.', 'pw' + p + ':' + t); }],
        pairs: [["work", "the energy transferred when a force moves an object", 0], ["joule", "the unit of work and energy"], ["power", "the rate of doing work", 0], ["watt", "the unit of power"], ["kilowatt", "one thousand watts"], ["machine", "a device that makes work easier"], ["effort", "the force we apply to a machine", 0], ["load", "the weight that a machine moves"], ["efficiency", "the part of the energy put into a machine that does useful work", 0], ["mechanical advantage", "the number of times a machine multiplies the effort", 0], ["distance moved", "the length of the path along which a force moves an object", 0], ["no work", "the result when a force does not move an object", 0], ["energy", "the ability to do work", 0], ["horsepower", "an old unit of power used for engines", 0]]
    });

    X("levers", "Levers", {
        i: "A lever is a bar that turns on a fixed point called the fulcrum. We apply an effort to move a load. There are three classes: first (fulcrum in the middle), second (load in the middle) and third (effort in the middle).",
        r: "A see-saw and scissors are first-class levers. A wheelbarrow and a bottle opener are second-class levers. A fishing rod and tweezers are third-class levers.",
        k: ["First class: fulcrum between load and effort.", "Second class: load between fulcrum and effort.", "Third class: effort between fulcrum and load.", "Balance: effort x effort arm = load x load arm."],
        e: ["Which class of lever is a wheelbarrow?", ["The wheel is the fulcrum at the front.", "The load is in the middle, effort at the handles."], "Second class"],
        d: D2.lever(),
        m: "Thinking a lever creates energy. It only makes the work easier by changing the force or direction."
    }, {
        gens: [function (r) { var pairs = [[30, 20, 2], [30, 10, 2], [40, 20, 3], [20, 10, 4], [60, 30, 2], [50, 25, 2], [40, 10, 2], [20, 5, 4], [30, 15, 4], [60, 20, 2], [40, 20, 4], [24, 12, 2]], p = P(r, pairs), f1 = p[0], f2 = p[1], d1 = p[2], d2 = f1 * d1 / f2; return numQ(r, 'A child weighing ' + f1 + ' N sits ' + d1 + ' m from the pivot of a see-saw. Where must a ' + f2 + ' N child sit on the other side to balance?', d2, [d1, d2 + 1, f1 / f2 + d1 + 2], 'm from the pivot', 'Moments balance: ' + f1 + ' x ' + d1 + ' = ' + f2 + ' x d, so d = ' + d2 + ' m.', 'lv' + f1 + ':' + f2 + ':' + d1); }],
        cats: { "first-class lever": ["a see-saw", "scissors", "a crowbar", "pliers", "a claw hammer", "a weighing balance"], "second-class lever": ["a wheelbarrow", "a nutcracker", "a bottle opener", "a door", "a stapler"], "third-class lever": ["a fishing rod", "tweezers", "a broom", "a shovel", "tongs"] },
        pairs: [["lever", "a bar that turns on a fixed point"], ["fulcrum", "the fixed point on which a lever turns"], ["effort", "the force applied to a lever or machine", 0], ["load", "the weight moved by a lever or machine"], ["first-class lever", "a lever with the fulcrum between the effort and the load"], ["second-class lever", "a lever with the load between the fulcrum and the effort"], ["third-class lever", "a lever with the effort between the fulcrum and the load"], ["effort arm", "the distance from the fulcrum to the point where the effort acts"], ["load arm", "the distance from the fulcrum to the load"], ["moment", "the turning effect of a force about a point"], ["principle of moments", "the rule that the clockwise moment equals the anticlockwise moment when balanced"], ["pivot", "another word for the fulcrum of a lever"], ["see-saw", "a first-class lever used for play"], ["crowbar", "a long metal bar used to lift or prise heavy things"], ["wheelbarrow", "a one-wheeled cart that is a second-class lever"], ["tweezers", "a pair of small tongs that is a third-class lever"]]
    });

    X("pulleys-wheel", "Pulleys and wheel and axle", {
        i: "A pulley is a grooved wheel with a rope. A fixed pulley changes the direction of the force; a movable pulley reduces the effort. A wheel and axle is a large wheel joined to a small rod (axle) that turn together.",
        r: "A well uses a pulley or windlass to raise water. A flag is raised with a fixed pulley. A steering wheel and a doorknob are wheel and axle machines.",
        k: ["Fixed pulley: changes direction.", "Movable pulley: halves the effort.", "Block and tackle: many pulleys together.", "Wheel and axle: large wheel gives a bigger turning force."],
        e: ["What does a fixed pulley do?", ["It does not move with the load.", "It only changes the direction of the pull."], "Changes the direction of the force"],
        d: D.cards("Pulleys and wheels", [["Fixed pulley", "pull down to lift up"], ["Movable pulley", "reduces the effort"], ["Wheel and axle", "steering wheel, doorknob"], ["Gear", "toothed wheels pass on motion"]]),
        m: "Thinking a fixed pulley makes the load lighter. It only changes direction."
    }, {
        pairs: [["pulley", "a wheel with a grooved rim that carries a rope"], ["fixed pulley", "a pulley fixed in one place that changes the direction of the force"], ["movable pulley", "a pulley that moves with the load and reduces the effort needed"], ["block and tackle", "a system of several pulleys working together"], ["wheel and axle", "a wheel fixed to a rod so that they turn together", 0], ["axle", "the rod at the centre of a wheel"], ["gear", "a wheel with teeth that fits another to pass on motion"], ["windlass", "a wheel and axle used to wind up a rope, as at a well"], ["crane", "a machine that uses pulleys to lift heavy loads"], ["steering wheel", "a wheel and axle that makes it easy to turn a vehicle"], ["doorknob", "a wheel and axle that makes it easy to turn the latch"], ["rope", "the cord that runs over a pulley"], ["groove", "the channel around the rim of a pulley that holds the rope"], ["effort", "the force we apply to a machine", 0], ["load", "the weight that a machine lifts"], ["screwdriver", "a wheel and axle in which the handle is the wheel and the shaft is the axle"]]
    });

    X("inclined-plane", "Inclined plane, wedge and screw", {
        i: "An inclined plane is a sloping surface that lets us raise a load with less effort over a longer distance. A wedge is two inclined planes joined back to back. A screw is an inclined plane wrapped round a rod.",
        r: "A ramp helps load a truck. An axe is a wedge that splits wood. A jar lid and a screw jack use screw threads.",
        k: ["Inclined plane: ramp, stairs, slope.", "Wedge: axe, knife, chisel, nail.", "Screw: bolt, jar lid, screw jack.", "These are simple machines; a bicycle is a compound machine."],
        e: ["Which simple machine is an axe?", ["It has a sharp edge that splits wood.", "Two sloping faces back to back."], "A wedge"],
        d: D.cards("Three more simple machines", [["Inclined plane", "a ramp or slope"], ["Wedge", "axe, knife, chisel"], ["Screw", "bolt, jar lid, screw jack"]]),
        m: "Thinking a ramp reduces the work needed. It reduces the effort but needs a longer distance."
    }, {
        cats: { "inclined plane": ["a ramp", "a staircase", "a slide", "a sloping road", "a loading plank"], "wedge": ["an axe", "a knife", "a chisel", "a nail", "a doorstop"], "screw": ["a jar lid", "a bolt", "a screw jack", "a wood screw", "a bottle top"] },
        pairs: [["inclined plane", "a sloping surface used to raise a load with less effort"], ["ramp", "a sloping path that joins a lower level to a higher one"], ["wedge", "two inclined planes back to back that split or cut things"], ["screw", "an inclined plane wrapped around a rod"], ["thread", "the spiral ridge on a screw"], ["axe", "a wedge used to split wood"], ["nail", "a wedge-shaped pin driven into wood"], ["screw jack", "a machine that uses a screw to lift heavy loads"], ["mountain road", "a road that zigzags up a hill so that the slope is gentle"], ["simple machine", "a device with few or no moving parts that makes work easier"], ["compound machine", "a machine made of two or more simple machines"], ["pitch", "the distance between two threads of a screw", 0], ["chisel", "a wedge used for cutting wood"], ["doorstop", "a wedge that holds a door open"], ["jar lid", "a cover that holds on tightly because of screw threads"], ["plough", "a farm tool with a wedge-shaped blade that cuts soil"]]
    });
})(typeof window !== 'undefined' ? window : globalThis);

(function (root) {
    if (!root.CMLearnBst) return;
    var h = root.CMLearnBst.h, X = h.X, S = h.S, D = h.D, D2 = h.D2, numQ = h.numQ, fmt = h.fmt, P = h.P, ri = h.ri;
    S("Electricity and Magnetism");

    X("static-electricity", "Static electricity", {
        i: "Static electricity is an electric charge that builds up on an object, usually by rubbing. There are positive and negative charges. Like charges repel; unlike charges attract. Lightning is a huge spark of static electricity.",
        r: "A balloon rubbed on your hair sticks to the wall. A comb rubbed on dry hair picks up bits of paper. Lightning conductors protect tall buildings.",
        k: ["Rubbing transfers electrons and charges objects.", "Like charges repel; unlike attract.", "Lightning is static electricity in the sky.", "A lightning conductor carries the charge safely to the ground."],
        e: ["What happens to two negative charges brought together?", ["They are alike.", "Like charges repel."], "They repel"],
        d: D.cards("Static charges", [["Like charges", "repel (push apart)"], ["Unlike charges", "attract (pull together)"], ["Rubbing", "moves electrons from one object to another"], ["Lightning", "a giant spark between cloud and ground"]]),
        m: "Thinking rubbing creates charge from nothing. It moves electrons from one object to the other."
    }, {
        sets: [
            { style: "fact", ctx: "thing", pairs: [["two like charges", "repel each other"], ["two unlike charges", "attract each other"], ["a rubbed balloon", "sticks to a wall"], ["a comb rubbed on dry hair", "picks up small pieces of paper"], ["a charged plastic ruler", "bends a thin stream of water towards it"], ["a lightning conductor", "carries lightning safely to the ground"], ["an electroscope", "shows whether an object is charged"], ["a charged object", "can attract light things such as paper bits"]] },
            { pairs: [["static electricity", "an electric charge that builds up on an object", 0], ["charge", "a property of matter that makes it feel electric forces", 0], ["positive charge", "the charge carried by protons"], ["negative charge", "the charge carried by electrons"], ["electron", "a tiny particle with a negative charge"], ["lightning", "a huge spark of static electricity between clouds or to the ground", 0], ["thunder", "the sound made when lightning heats the air suddenly", 0], ["lightning conductor", "a metal rod on a building that carries lightning to the ground"], ["insulator", "a material that does not let charge flow through it easily"], ["conductor", "a material that lets charge flow through it easily"], ["electroscope", "an instrument for detecting electric charge"], ["attract", "to pull together", 0], ["repel", "to push apart", 0], ["spark", "a small flash made when charge jumps across a gap"]] }
        ]
    });

    X("cells-batteries", "Cells and batteries", {
        i: "An electric cell changes chemical energy into electrical energy. A battery is two or more cells joined together. Cells have a positive and a negative terminal. Voltage is measured in volts.",
        r: "A torch uses dry cells. A car has a rechargeable battery. A phone power bank stores charge.",
        k: ["Cell: one unit; battery: several cells.", "Dry cells cannot be recharged; some batteries can.", "Cells in series add their voltages.", "Remove old cells to stop leaking."],
        e: ["A torch has 2 cells of 1.5 V in series. What is the total voltage?", ["In series, voltages add.", "1.5 + 1.5 = 3."], "3 V"],
        d: D.cards("Cells", [["Cell", "chemical to electrical energy"], ["Battery", "two or more cells"], ["Terminals", "positive (+) and negative (-)"], ["Volt", "unit of voltage"]]),
        m: "Using the word battery for a single cell. A battery is two or more cells."
    }, {
        gens: [function (r) { var n = ri(r, 2, 10); return numQ(r, 'A torch has ' + n + ' cells of 1.5 V each joined in series. What is the total voltage?', n * 1.5, [n, n * 1.5 + 1.5, n * 3], 'V', 'In series the voltages add: ' + n + ' x 1.5 = ' + fmt(n * 1.5) + ' V.', 'cs' + n); }],
        pairs: [["electric cell", "a device that changes chemical energy into electrical energy"], ["battery", "two or more cells joined together"], ["terminal", "the end of a cell where wires are connected"], ["positive terminal", "the terminal marked plus on a cell"], ["negative terminal", "the terminal marked minus on a cell"], ["dry cell", "a cell with a paste inside instead of a free liquid"], ["rechargeable battery", "a battery that can be charged and used again"], ["disposable cell", "a cell that is thrown away when it is used up"], ["solar cell", "a cell that changes sunlight into electricity"], ["voltage", "the push that makes current flow in a circuit", 0], ["volt", "the unit of voltage"], ["car battery", "a large rechargeable battery that starts a car engine"], ["electrolyte", "the paste or liquid inside a cell that reacts with the metals"], ["button cell", "a small flat cell used in watches"], ["power bank", "a portable battery used to charge phones"], ["cell holder", "a holder that keeps cells in place in a circuit"]]
    });

    X("simple-circuits", "Simple circuits", {
        i: "An electric circuit is a complete path for current. A simple circuit has a cell, wires, a switch and a lamp. Current flows only in a closed circuit. A gap makes it an open circuit.",
        r: "Pressing the torch switch closes the circuit and the bulb lights. A fuse melts if too much current flows and protects the circuit.",
        k: ["Closed circuit: current flows; open circuit: it does not.", "Current is measured in amperes with an ammeter.", "Circuit diagrams use symbols.", "A short circuit is dangerous."],
        e: ["Why does a lamp not light when the switch is open?", ["There is a gap in the circuit.", "Current cannot flow."], "The circuit is broken"],
        d: D2.circuit('series'),
        m: "Thinking current is used up in the lamp. The same current flows round the whole circuit."
    }, {
        pairs: [["electric circuit", "a complete path along which electric current flows"], ["current", "the flow of electric charge", 0], ["ampere", "the unit of electric current"], ["switch", "a device that opens and closes a circuit"], ["open circuit", "a circuit with a gap so that no current flows"], ["closed circuit", "a complete circuit in which current flows"], ["lamp", "a device that gives light when current flows through it"], ["filament", "the thin wire inside a bulb that glows"], ["wire", "a metal thread that carries current"], ["circuit diagram", "a drawing that uses symbols to show a circuit"], ["short circuit", "a path with very little resistance that lets too much current flow"], ["fuse", "a thin wire that melts when too much current flows"], ["ammeter", "an instrument for measuring current"], ["voltmeter", "an instrument for measuring voltage"], ["resistance", "how much a material opposes the flow of current", 0], ["buzzer", "a device that makes a sound when current flows"]]
    });

    X("series-parallel", "Series and parallel circuits", {
        i: "In a series circuit there is only one path, so if one lamp breaks all go out and lamps share the voltage. In a parallel circuit each lamp has its own path, so the others stay on and each lamp is bright. Homes are wired in parallel.",
        r: "House sockets are in parallel so a faulty bulb does not switch off the whole house.",
        k: ["Series: one path; one break stops everything.", "Parallel: branches; others keep working.", "More lamps in series: dimmer.", "Household wiring is parallel."],
        e: ["In a series circuit one lamp is removed. What happens to the others?", ["There is one path.", "Removing a lamp breaks it."], "They go out"],
        d: D2.circuit('parallel'),
        m: "Thinking all lamps in parallel share one current. Each branch gets its own current."
    }, {
        sets: [
            { style: "fact", ctx: "circuit", pairs: [["a series circuit", "stops working if one lamp breaks"], ["a parallel circuit", "keeps the other lamps working if one lamp breaks"], ["household wiring", "is in parallel so that each appliance gets the full voltage"], ["an extra lamp added in series", "makes all the lamps dimmer"], ["an extra lamp added in parallel", "does not dim the other lamps"], ["a switch in series with a lamp", "controls that lamp"], ["a circuit with one path only", "is a series circuit"], ["a circuit with branches", "is a parallel circuit"]] },
            { pairs: [["series circuit", "a circuit with only one path for the current"], ["parallel circuit", "a circuit with more than one path for the current"], ["branch", "a separate path in a parallel circuit"], ["junction", "a point where wires meet and the current splits"], ["component", "a part of a circuit such as a lamp or a switch"], ["load", "a device that uses electricity in a circuit"], ["domestic wiring", "the wiring system in a home, made in parallel", 0], ["circuit breaker", "a switch that opens by itself when too much current flows"], ["extension socket", "a strip of sockets that connects many appliances in parallel"], ["dim", "to give less light"], ["bright", "to give more light"], ["break in a circuit", "a gap that stops the current"], ["complete circuit", "a circuit with no gaps", 0], ["short circuit", "a path with very little resistance that lets too much current flow"], ["voltage drop", "the fall in voltage across each component", 0]] }
        ]
    });

    X("conductors-insulators", "Conductors and insulators", {
        i: "A conductor lets electric current pass through easily (metals, graphite, salt water). An insulator does not (plastic, rubber, wood, glass). Wires are copper covered with plastic to keep us safe.",
        r: "The metal pins of a plug conduct; the plastic case insulates. Electricians wear rubber gloves.",
        k: ["Conductors: copper, iron, aluminium, graphite.", "Insulators: rubber, plastic, wood, glass.", "Pure water is a poor conductor; salt water is good.", "The human body conducts electricity."],
        e: ["Why are electric cables covered with plastic?", ["Plastic does not conduct.", "It protects us from shock."], "Plastic is an insulator"],
        d: D.table("Conductors and insulators", ["Conductor", "Insulator"], [["copper wire", "plastic cover"], ["iron nail", "rubber glove"], ["graphite", "dry wood"], ["salt water", "glass"]]),
        m: "Thinking all metals are the only conductors. Graphite and salt water conduct too."
    }, {
        cats: { "electrical conductor": ["copper", "iron", "aluminium", "silver", "steel", "graphite", "salt water", "brass"], "electrical insulator": ["plastic", "rubber", "wood", "glass", "dry cloth", "porcelain", "paper", "air"] },
        pairs: [["conductor", "a material that lets electric current pass through easily"], ["insulator", "a material that does not let electric current pass through easily"], ["semiconductor", "a material that conducts only a little, such as silicon"], ["resistance", "how much a material opposes the flow of current", 0], ["cable", "a thick wire or group of wires that carries electricity"], ["insulation", "a covering that stops electricity or heat escaping", 0], ["earth wire", "a wire that carries stray current safely to the ground"], ["circuit tester", "a simple circuit used to test whether a material conducts"], ["graphite", "the non-metal that conducts electricity", 0], ["porcelain insulator", "a ceramic piece that holds power lines away from the pole"], ["high-tension cable", "a thick cable that carries electricity over long distances"], ["pylon", "a tall metal tower that carries power lines"], ["rubber glove", "a glove that protects an electrician from shock"], ["conduction of electricity", "the passing of electric current through a material", 0]]
    });

    X("electricity-safety", "Electricity at home and safety", {
        i: "Electricity is useful but dangerous. Fuses and circuit breakers protect circuits. Never touch switches with wet hands, overload sockets or repair live appliances. Electricity used is measured in kilowatt-hours by a meter.",
        r: "A prepaid meter lets you pay before using power. Do not fly a kite near power lines.",
        k: ["Use plugs with fuses and earth wires.", "Keep water away from sockets.", "Do not overload a socket.", "Call an electrician for repairs."],
        e: ["Why should you not touch a switch with wet hands?", ["Water conducts.", "You may get a shock."], "Wet hands conduct electricity and can cause shock"],
        d: D.cards("Safety rules", [["Do", "use fused plugs, switch off before repairs"], ["Do not", "touch with wet hands, overload sockets"], ["In danger", "switch off the supply and call help"]]),
        m: "Pulling a plug by its wire. Hold the plug itself."
    }, {
        cats: { "safe practice": ["switching off before changing a bulb", "using a plug with a fuse", "keeping cables away from water", "asking an adult to repair appliances", "pulling the plug, not the wire", "covering unused sockets"], "unsafe practice": ["touching a switch with wet hands", "overloading a socket", "repairing a live appliance", "flying a kite near power lines", "poking a wire into a socket", "standing in water near a cable"] },
        pairs: [["fuse", "a thin wire that melts when too much current flows"], ["circuit breaker", "a switch that opens by itself when too much current flows"], ["earthing", "connecting an appliance to the ground to carry stray current away", 0], ["live wire", "the wire that carries current to an appliance"], ["neutral wire", "the wire that carries current back from an appliance"], ["earth wire", "the safety wire that carries stray current to the ground"], ["short circuit", "a fault that lets too much current flow along a short path"], ["overload", "too many appliances using one socket", 0], ["electric shock", "the harmful effect when current passes through the body"], ["plug", "a device that connects an appliance to a socket"], ["socket", "a wall fitting that supplies electricity"], ["prepaid meter", "a meter that lets us pay for electricity before we use it"], ["kilowatt-hour", "the unit used to measure the electricity used at home"], ["electricity meter", "a device that measures the electricity used in a home"], ["power cut", "a break in the supply of electricity"], ["surge protector", "a device that protects appliances from sudden rises in voltage"]]
    });

    X("magnets", "Magnets and magnetic materials", {
        i: "A magnet attracts magnetic materials such as iron, steel, nickel and cobalt. Every magnet has two poles, north and south. Like poles repel; unlike poles attract.",
        r: "A fridge magnet sticks to the door. A magnet picks needles from a heap of sand. A magnetic compass points north.",
        k: ["Magnetic: iron, steel, nickel, cobalt.", "Non-magnetic: wood, plastic, copper, aluminium, glass.", "Poles are strongest at the ends.", "Keep magnets with keepers; do not hammer or heat them."],
        e: ["Will a magnet attract an aluminium can?", ["Aluminium is not iron, nickel or cobalt.", "It is not magnetic."], "No"],
        d: D.cards("Magnets", [["Magnetic", "iron, steel, nickel, cobalt"], ["Non-magnetic", "wood, plastic, copper, glass"], ["Poles", "north and south; unlike attract"]]),
        m: "Thinking a magnet attracts all metals. Only a few metals are magnetic."
    }, {
        cats: { "magnetic material": ["an iron nail", "a steel pin", "a nickel coin", "cobalt", "a steel paper clip", "iron filings"], "non-magnetic material": ["a plastic ruler", "a wooden spoon", "copper wire", "aluminium foil", "glass", "a rubber band"] },
        pairs: [["magnet", "an object that attracts iron and steel"], ["magnetic material", "a material that is attracted to a magnet"], ["non-magnetic material", "a material that is not attracted to a magnet"], ["pole", "the end of a magnet where the force is strongest"], ["north pole", "the end of a magnet that points north when it swings freely"], ["south pole", "the end of a magnet that points south when it swings freely"], ["repel", "to push apart", 0], ["magnetise", "to turn a material into a magnet", 0], ["demagnetise", "to take away the magnetism of a magnet", 0], ["keeper", "a piece of iron placed across the poles of a stored magnet"], ["bar magnet", "a magnet shaped like a straight rod"], ["horseshoe magnet", "a magnet bent into the shape of a U"], ["permanent magnet", "a magnet that keeps its magnetism for a long time"], ["temporary magnet", "a magnet that loses its magnetism easily, such as soft iron"], ["magnetism", "the property of attracting magnetic materials", 0], ["lodestone", "a naturally magnetic rock", 0]]
    });

    X("poles-fields", "Poles and magnetic fields", {
        i: "A magnetic field is the space around a magnet where its force can be felt. Field lines run from the north pole to the south pole and are closest together at the poles. The Earth behaves like a giant magnet.",
        r: "Iron filings sprinkled round a magnet show its field. A magnet hung on a thread settles pointing north and south.",
        k: ["Field lines: north to south outside the magnet.", "The field is strongest at the poles.", "A freely hung magnet points north-south.", "A broken magnet makes two smaller magnets."],
        e: ["Which way do field lines point outside a magnet?", ["They leave one pole.", "They go from the north pole to the south pole."], "From north to south"],
        d: D2.magnet(),
        m: "Thinking a magnet cut in half gives one north pole and one south pole separately. Each half has both poles."
    }, {
        mcq: [["Where is a magnet strongest?", "At the poles", ["In the middle", "Everywhere equally", "Only on one side"], "Field lines are closest together at the poles."], ["What do iron filings show around a magnet?", "Its magnetic field", ["Its mass", "Its colour", "Its age"], "They line up along field lines."]],
        sets: [
            { style: "fact", ctx: "thing", pairs: [["two north poles", "repel each other"], ["a north pole and a south pole", "attract each other"], ["a freely hung bar magnet", "settles pointing north and south"], ["iron filings around a magnet", "gather most thickly at the poles"], ["the Earth", "behaves like a giant bar magnet"], ["a magnetic field line", "runs from the north pole to the south pole outside the magnet"], ["a broken magnet", "becomes two smaller magnets, each with two poles"], ["a magnet kept with a keeper", "stays strong for longer"], ["hammering a magnet", "weakens it"], ["a stronger magnet", "has a larger magnetic field"]] },
            { pairs: [["magnetic field", "the space around a magnet where its force can be felt"], ["field line", "a line that shows the direction of a magnetic field"], ["iron filings", "tiny pieces of iron used to show a magnetic field", 0], ["north-seeking pole", "the end of a magnet that points towards the north"], ["magnetic north", "the direction in which a compass needle points", 0], ["plotting compass", "a small compass used to trace field lines"], ["magnetic force", "the force of attraction or repulsion between magnets", 0], ["repulsion", "the pushing apart of like poles", 0], ["attraction", "the pulling together of unlike poles", 0], ["magnetic shield", "a piece of soft iron that guides field lines away from an object"], ["flux density", "how closely packed the field lines are", 0], ["geographic pole", "a point at the top or bottom of the Earth axis"], ["magnetic pole of the Earth", "a place near the geographic pole where the Earth magnetic force is strongest"]] }
        ]
    });

    X("electromagnets", "Electromagnets", {
        i: "An electromagnet is a magnet made by passing electric current through a coil of wire wound on an iron core. It can be switched on and off. It is stronger with more turns, more current or a soft iron core.",
        r: "A crane at a scrapyard uses a big electromagnet to lift iron and drop it by switching off. An electric bell and a motor also use electromagnets.",
        k: ["Current through a coil makes a magnet.", "More turns, more current, iron core: stronger.", "Reversing the current reverses the poles.", "Uses: crane, bell, motor, relay."],
        e: ["How can you make an electromagnet stronger?", ["Increase turns of the coil.", "Use a bigger current or an iron core."], "Add more turns, use more current or an iron core"],
        d: D.flow("Making an electromagnet", ["Wind insulated wire round an iron nail", "Connect the wire ends to a cell and switch", "Switch on: the nail becomes a magnet", "Switch off: it loses its magnetism"]),
        m: "Using a steel rod as the core and expecting it to switch off completely. Soft iron loses magnetism quickly."
    }, {
        sets: [
            { style: "fact", ctx: "thing", pairs: [["an electromagnet", "loses its magnetism when the current is switched off"], ["a coil with more turns", "makes a stronger electromagnet"], ["a bigger current", "makes an electromagnet stronger"], ["a soft iron core", "makes an electromagnet stronger and loses its magnetism quickly"], ["a steel core", "keeps some magnetism after the current is off"], ["reversing the current", "reverses the poles of an electromagnet"], ["a scrapyard crane", "lifts iron and drops it by switching the current off"], ["an electric bell", "rings because an electromagnet pulls a hammer to the gong"], ["an electric motor", "turns because of forces between magnets and a current-carrying coil"]] },
            { pairs: [["electromagnet", "a magnet made by passing electric current through a coil of wire"], ["coil", "wire wound in many loops"], ["core", "the iron bar inside a coil"], ["solenoid", "a long coil of wire that acts like a magnet when current flows"], ["electric bell", "a device that uses an electromagnet to make a hammer strike a gong"], ["relay", "a switch that is worked by an electromagnet"], ["electric motor", "a machine that changes electrical energy into movement using electromagnets"], ["dynamo", "a machine that changes movement into electricity"], ["soft iron", "iron that is easily magnetised and loses its magnetism quickly", 0], ["steel", "an alloy of iron that keeps its magnetism for long", 0], ["insulated wire", "wire covered with plastic or enamel", 0]] }
        ]
    });

    X("compass", "The compass", {
        i: "A magnetic compass has a needle that is a small magnet. It points to magnetic north, so it shows direction. The four cardinal points are north, south, east and west; between them are north-east, north-west, south-east and south-west.",
        r: "Travellers, sailors and hunters use a compass with a map. The Sun rises in the east and sets in the west.",
        k: ["Needle points north.", "Cardinal points: N, E, S, W.", "Keep a compass away from magnets and iron.", "A map has a scale and a key."],
        e: ["Facing north, you turn right through a quarter turn. Which way do you face?", ["Right of north is east."], "East"],
        d: D2.compass(),
        m: "Thinking the compass points to the geographic North Pole. It points to magnetic north."
    }, {
        gens: [function (r) { var dirs = ['north', 'east', 'south', 'west'], a = ri(r, 0, 3), n = ri(r, 1, 7), cw = P(r, [true, false]); var res = dirs[((a + (cw ? n : -n)) % 4 + 4) % 4]; return ['You face ' + dirs[a] + ' and turn ' + n + ' quarter turn' + (n > 1 ? 's' : '') + ' ' + (cw ? 'clockwise' : 'anticlockwise') + '. Which direction do you now face?', h.cap(res), dirs.filter(function (x) { return x !== res; }).map(h.cap), 'Each quarter turn moves one cardinal point ' + (cw ? 'clockwise (N, E, S, W)' : 'anticlockwise (N, W, S, E)') + '.', 'cp' + a + ':' + n + ':' + cw]; }],
        cats: { "cardinal point": ["north", "south", "east", "west"], "intercardinal point": ["north-east", "north-west", "south-east", "south-west"] },
        pairs: [["compass", "an instrument with a magnetic needle that shows direction"], ["compass needle", "a small magnet that points to magnetic north"], ["cardinal point", "one of the four main directions: north, south, east or west"], ["intercardinal point", "a direction between two cardinal points, such as north-east"], ["bearing", "a direction measured as an angle from north"], ["magnetic north", "the direction in which a compass needle points", 0], ["true north", "the direction of the geographic North Pole", 0], ["navigation", "finding the way from one place to another", 0], ["map", "a drawing of an area that shows places"], ["scale", "the part of a map that shows how distances are shown", 0], ["key", "the part of a map that explains its symbols"], ["GPS", "a satellite system that finds the position of a phone or vehicle", 0], ["dial", "the face of a compass marked with directions"], ["orienteering", "a sport in which people find their way using a map and compass", 0], ["landmark", "a clear object on land used to find the way"], ["direction", "the way something is pointing or moving"]]
    });
})(typeof window !== 'undefined' ? window : globalThis);

(function (root) {
    if (!root.CMLearnBst) return;
    var h = root.CMLearnBst.h, X = h.X, S = h.S, D = h.D, D2 = h.D2;
    S("Earth and Space");

    X("earth-structure", "Structure of the Earth", {
        i: "The Earth has layers: the thin rocky crust, the thick hot mantle, the liquid outer core and the solid inner core. The crust is broken into plates that slowly move, causing earthquakes and volcanoes.",
        r: "We live on the crust. Hot melted rock (magma) rises through a volcano and becomes lava. A seismograph records earthquakes.",
        k: ["Layers: crust, mantle, outer core, inner core.", "Crust: thinnest layer; we live on it.", "Magma is melted rock underground; lava is on the surface.", "The equator divides the Earth into two hemispheres."],
        e: ["Which layer of the Earth do we live on?", ["It is the outside layer.", "The thin rocky crust."], "The crust"],
        d: D.layers("Layers of the Earth", [["Crust", "#a16207", "thin, rocky, we live here", "#ffffff"], ["Mantle", "#ea580c", "thick, hot, partly molten rock", "#ffffff"], ["Outer core", "#facc15", "liquid metal"], ["Inner core", "#fde68a", "solid hot metal"]]),
        m: "Thinking the Earth is solid rock all the way through. It has a liquid outer core."
    }, {
        pairs: [["crust", "the thin rocky outer layer of the Earth"], ["mantle", "the thick layer of hot rock under the crust"], ["outer core", "the layer of liquid metal around the inner core"], ["inner core", "the solid metal centre of the Earth"], ["tectonic plate", "a huge slab of the Earth crust"], ["earthquake", "a shaking of the ground caused by moving rocks"], ["volcano", "an opening in the crust through which hot rock erupts"], ["magma", "hot melted rock under the ground", 0], ["lava", "magma that has reached the surface", 0], ["seismograph", "an instrument that records earthquakes"], ["continent", "one of the seven large land masses"], ["ocean", "a very large body of salt water"], ["equator", "the imaginary line around the middle of the Earth"], ["hemisphere", "half of the Earth"], ["axis", "an imaginary line through the Earth from pole to pole"], ["pole", "one of the two points at the top and bottom of the Earth"]]
    });

    X("rotation-day-night", "Rotation, day and night", {
        i: "The Earth spins on its axis once in about 24 hours. This is rotation. The side facing the Sun has day; the side facing away has night. The Sun seems to rise in the east and set in the west because the Earth spins from west to east.",
        r: "Morning shadows are long and point west. At noon the Sun is highest and shadows are shortest. At night we can see stars.",
        k: ["One rotation = about 24 hours.", "Rotation causes day and night.", "The Sun rises in the east and sets in the west.", "A time zone is a region with the same standard time."],
        e: ["Why do we have day and night?", ["The Earth spins.", "One side faces the Sun while the other side is dark."], "Because the Earth rotates"],
        d: D2.rotation(),
        m: "Saying the Sun moves around the Earth. It is the Earth that spins."
    }, {
        sets: [
            { style: "fact", ctx: "thing", pairs: [["the Earth", "takes about 24 hours to spin once on its axis"], ["the Sun", "seems to rise in the east and set in the west because the Earth spins"], ["the side of the Earth facing the Sun", "has daytime"], ["the side facing away from the Sun", "has night"], ["noon", "is when the Sun is highest in the sky"], ["a globe", "is a model of the Earth that can be spun"], ["a time zone", "is a region that keeps the same standard time"]] },
            { pairs: [["rotation", "the spinning of the Earth on its axis", 0], ["axis", "an imaginary line through the Earth from the North Pole to the South Pole"], ["day", "the time when our part of the Earth faces the Sun"], ["night", "the time when our part of the Earth faces away from the Sun"], ["sunrise", "the time when the Sun first appears in the morning", 0], ["sunset", "the time when the Sun disappears in the evening", 0], ["dawn", "the first light before sunrise", 0], ["dusk", "the time just after sunset when it is nearly dark", 0], ["midnight", "twelve o clock at night", 0], ["twenty-four hours", "the time for one full rotation of the Earth", 0], ["daylight", "the light from the Sun during the day", 0], ["time zone", "a region that keeps the same standard time"]] }
        ]
    });

    X("revolution-seasons", "Revolution and seasons", {
        i: "Revolution is the movement of the Earth around the Sun, which takes about 365 days (one year). The Earth axis is tilted, so different places get different amounts of sunlight during the year and this causes the seasons. Nigeria has a rainy season and a dry season.",
        r: "The harmattan comes in the dry season, from about November to March. Countries far from the equator have four seasons: spring, summer, autumn and winter.",
        k: ["Revolution: one year; about 365 days.", "A leap year has 366 days.", "Tilt of the axis causes seasons.", "Nigeria: rainy and dry seasons."],
        e: ["How long does the Earth take to go round the Sun?", ["The path is called an orbit.", "It takes one year."], "About 365 days"],
        d: D.cycle("The Earth goes round the Sun", ["Sun at centre", "Earth moves in its orbit", "One year of seasons", "Back to the start"]),
        m: "Thinking seasons come because the Earth is nearer to or further from the Sun. They come from the tilt of the axis."
    }, {
        sets: [
            { style: "fact", ctx: "thing", pairs: [["the Earth", "takes about 365 days to go round the Sun"], ["a leap year", "has 366 days and comes every four years"], ["the tilt of the Earth axis", "causes the seasons"], ["Nigeria", "has two main seasons, the rainy and the dry"], ["the harmattan", "is a cool, dry, dusty wind that blows from the Sahara"], ["the dry season in Nigeria", "runs roughly from November to March"], ["the rainy season in the south", "lasts longer than the rainy season in the north"], ["a country far from the equator", "has four seasons"]] },
            { pairs: [["revolution", "the movement of the Earth around the Sun", 0], ["orbit", "the curved path of one body around another in space"], ["year", "the time the Earth takes to go once round the Sun"], ["leap year", "a year with 366 days"], ["season", "a part of the year with its own kind of weather"], ["tilt", "the lean of the Earth axis", 0], ["summer", "the hottest season in places far from the equator", 0], ["winter", "the coldest season in places far from the equator", 0], ["tropics", "the hot region near the equator"], ["equator", "the imaginary line around the middle of the Earth"], ["calendar", "a chart that shows the days, weeks and months of a year"], ["rainy season", "the time of year when it rains often"]] }
        ]
    });

    X("sun", "The Sun", {
        i: "The Sun is a star at the centre of our solar system. It is a huge ball of hot gas, mostly hydrogen and helium, that gives us light and heat. Its energy comes from nuclear fusion.",
        r: "The Sun dries clothes, helps plants grow and powers solar panels. Too much sun can cause sunburn, so we wear hats and use sunscreen.",
        k: ["The Sun is a star.", "Sunlight reaches Earth in about 8 minutes.", "Never look straight at the Sun.", "Solar energy is renewable."],
        e: ["Is the Sun a planet or a star?", ["It makes its own light.", "It is a star."], "A star"],
        d: D.cards("The Sun", [["What it is", "a star made of hot gas"], ["What it gives", "light and heat"], ["Distance", "light takes about 8 minutes to reach us"], ["Safety", "never stare at it"]]),
        m: "Thinking the Sun is burning like a fire. It shines by nuclear fusion."
    }, {
        sets: [
            { style: "fact", ctx: "thing", pairs: [["the Sun", "is a star made mostly of hydrogen and helium"], ["sunlight", "takes about 8 minutes to reach the Earth"], ["the gravity of the Sun", "keeps the planets moving round it"], ["the surface of the Sun", "is about 5500 degrees Celsius"], ["a sunspot", "is a cooler patch on the surface of the Sun"], ["ultraviolet light", "from the Sun can burn the skin"], ["a solar panel", "changes sunlight into electricity"], ["sunscreen", "protects the skin from ultraviolet light"]] },
            { pairs: [["Sun", "the star at the centre of our solar system"], ["star", "a huge ball of hot glowing gas that makes its own light"], ["solar energy", "the energy that comes from the Sun", 0], ["sunspot", "a cooler dark patch on the surface of the Sun"], ["solar flare", "a sudden burst of energy from the Sun surface"], ["corona", "the glowing outer layer of the Sun"], ["nuclear fusion", "the process that powers the Sun by joining hydrogen atoms", 0], ["hydrogen", "the gas that makes up most of the Sun", 0], ["ultraviolet ray", "a harmful ray from the Sun that can burn the skin"], ["sunburn", "red painful skin caused by too much sun", 0], ["solar panel", "a device that changes sunlight into electricity"], ["sunlight", "the light that comes from the Sun", 0]] }
        ]
    });

    X("moon-phases", "The Moon and its phases", {
        i: "The Moon is the Earth natural satellite. It reflects sunlight. It goes round the Earth in about a month and we see different lit parts, called phases: new moon, crescent, quarter, gibbous and full moon.",
        r: "The Moon pulls the sea, which causes tides. In 1969 Neil Armstrong was the first person to walk on the Moon.",
        k: ["The Moon makes no light; it reflects sunlight.", "Phases repeat about every 29.5 days.", "Waxing: getting bigger; waning: getting smaller.", "The Moon has craters and no air."],
        e: ["What do we call the phase when the whole face of the Moon is lit?", ["It is lit all over.", "Full moon."], "Full moon"],
        d: D2.moon(),
        m: "Thinking the phases are caused by the Earth shadow. The shadow causes eclipses; phases come from our view of the lit half."
    }, {
        pairs: [["Moon", "the natural satellite that orbits the Earth"], ["phase", "the shape of the lit part of the Moon that we see"], ["new moon", "the phase when the Moon cannot be seen"], ["full moon", "the phase when the whole face of the Moon is lit"], ["crescent", "a thin curved shape of the lit Moon"], ["quarter moon", "the phase when half of the Moon face is lit"], ["waxing", "getting bigger, as the lit part of the Moon grows", 0], ["waning", "getting smaller, as the lit part of the Moon shrinks", 0], ["lunar month", "about 29.5 days, the time for the Moon to go through all its phases"], ["crater", "a bowl-shaped hole on the surface of the Moon"], ["tide", "the rise and fall of the sea, caused mainly by the pull of the Moon"], ["moonlight", "sunlight reflected from the surface of the Moon", 0], ["Neil Armstrong", "the first person to walk on the Moon", 0], ["Apollo 11", "the first mission to land people on the Moon", 0], ["gibbous", "between half full and full, as seen in the Moon phases", 0], ["lunar", "relating to the Moon", 0]]
    });

    X("eclipses", "Eclipses", {
        i: "A solar eclipse happens when the Moon passes between the Sun and the Earth and blocks the sunlight. A lunar eclipse happens when the Earth passes between the Sun and the Moon and its shadow falls on the Moon.",
        r: "During a total solar eclipse the day becomes dark for a few minutes. Never look at a solar eclipse without special glasses.",
        k: ["Solar eclipse: Moon between Sun and Earth, at new moon.", "Lunar eclipse: Earth between Sun and Moon, at full moon.", "Total, partial and annular eclipses.", "Do not look at the Sun without eclipse glasses."],
        e: ["Which object is in the middle during a solar eclipse?", ["The Moon blocks the Sun.", "So the Moon is in the middle."], "The Moon"],
        d: D2.eclipse(true),
        m: "Looking at a solar eclipse with the naked eye. It can permanently damage the eyes."
    }, {
        sets: [
            { style: "fact", ctx: "thing", pairs: [["a solar eclipse", "happens at new moon"], ["a lunar eclipse", "happens at full moon"], ["looking at the Sun during an eclipse", "can damage the eyes"], ["a total solar eclipse", "lasts only a few minutes in one place"], ["the Earth shadow", "falls on the Moon during a lunar eclipse"], ["eclipse glasses", "make it safe to look at a solar eclipse"], ["the umbra of the Moon", "is the darkest part of its shadow on the Earth"], ["an annular eclipse", "leaves a bright ring of the Sun around the Moon"]] },
            { pairs: [["solar eclipse", "the blocking of sunlight when the Moon passes between the Sun and the Earth"], ["lunar eclipse", "the darkening of the Moon when the Earth shadow falls on it"], ["umbra", "the darkest part of a shadow"], ["penumbra", "the lighter outer part of a shadow"], ["total eclipse", "an eclipse in which the whole Sun or Moon is covered"], ["partial eclipse", "an eclipse in which only part of the Sun or Moon is covered"], ["annular eclipse", "an eclipse in which the Moon leaves a ring of the Sun showing"], ["corona", "the glowing outer layer of the Sun seen during a total eclipse"], ["eclipse glasses", "special glasses that make it safe to look at the Sun"], ["alignment", "the lining up of the Sun, the Moon and the Earth", 0], ["eclipse", "the hiding of one space body by the shadow or body of another"], ["shadow", "a dark area formed when light is blocked"]] }
        ]
    });

    X("solar-system", "The solar system", {
        i: "The solar system is the Sun and everything that moves around it: eight planets, their moons, dwarf planets, asteroids and comets. In order from the Sun: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.",
        r: "Earth is the only planet known to have life. Jupiter is the largest. Saturn has bright rings. Mars is called the red planet.",
        k: ["Inner rocky planets: Mercury, Venus, Earth, Mars.", "Outer gas and ice planets: Jupiter, Saturn, Uranus, Neptune.", "Asteroids lie between Mars and Jupiter.", "Planets orbit the Sun."],
        e: ["Which is the largest planet?", ["Think of the gas giants.", "Jupiter."], "Jupiter"],
        d: D2.solar(),
        m: "Thinking the Sun is a planet. The Sun is a star."
    }, {
        mcq: [["Which planet is third from the Sun?", "Earth", ["Venus", "Mars", "Jupiter"], "Order: Mercury, Venus, Earth, Mars."], ["How many planets are in the solar system?", "Eight", ["Seven", "Nine", "Ten"], "Mercury to Neptune."]],
        cats: { "inner planet": ["Mercury", "Venus", "Earth", "Mars"], "outer planet": ["Jupiter", "Saturn", "Uranus", "Neptune"] },
        pairs: [["solar system", "the Sun and all the objects that move around it"], ["planet", "a large body that orbits the Sun"], ["dwarf planet", "a small round body that orbits the Sun, such as Pluto"], ["asteroid", "a small rocky body that orbits the Sun"], ["comet", "an icy body that grows a glowing tail near the Sun"], ["meteor", "a streak of light made when a space rock burns up in the air"], ["meteorite", "a space rock that lands on the ground"], ["Mercury", "the planet closest to the Sun", 0], ["Venus", "the hottest planet", 0], ["Earth", "the only planet known to have life", 0], ["Mars", "the red planet", 0], ["Jupiter", "the largest planet", 0], ["Saturn", "the planet with bright rings", 0], ["Uranus", "the planet that spins on its side", 0], ["Neptune", "the planet farthest from the Sun", 0], ["asteroid belt", "the region between Mars and Jupiter full of asteroids"]]
    });

    X("stars-constellations", "Stars and constellations", {
        i: "Stars are huge balls of hot gas that make their own light. They look tiny because they are very far away. A constellation is a group of stars that forms a pattern. A galaxy is a huge group of billions of stars; ours is the Milky Way.",
        r: "The North Star helps travellers find north. Astronomers use telescopes to study stars.",
        k: ["Stars make light; planets reflect it.", "Constellations are patterns, e.g. Orion.", "A light year is a distance.", "Our galaxy is the Milky Way."],
        e: ["What is a constellation?", ["Stars appear in groups.", "People joined them into pictures."], "A group of stars that forms a pattern"],
        d: D.cards("Space words", [["Star", "makes its own light"], ["Constellation", "a pattern of stars"], ["Galaxy", "billions of stars"], ["Universe", "all of space"]]),
        m: "Thinking stars twinkle because they blink. The air in the atmosphere makes the light flicker."
    }, {
        pairs: [["star", "a huge ball of hot glowing gas that makes its own light"], ["constellation", "a group of stars that makes a pattern in the sky"], ["galaxy", "a huge group of billions of stars"], ["Milky Way", "the galaxy that contains our solar system", 0], ["light year", "the distance that light travels in one year"], ["North Star", "a bright star almost above the North Pole that helps us find north", 0], ["Southern Cross", "a small bright constellation seen in the southern sky", 0], ["twinkle", "to shine with a flickering light because of moving air", 0], ["telescope", "an instrument that makes distant objects look bigger and clearer"], ["astronomer", "a scientist who studies space"], ["astronomy", "the science that studies space and the bodies in it", 0], ["universe", "all of space and everything in it", 0], ["nebula", "a cloud of gas and dust in space"], ["supernova", "the huge explosion of a very large star"], ["Orion", "a constellation shaped like a hunter", 0], ["sun", "the star nearest to the Earth", 0]]
    });

    X("satellites-space", "Satellites and space exploration", {
        i: "A satellite is an object that orbits a larger body. The Moon is a natural satellite. Artificial satellites are machines launched by rockets for communication, weather forecasting and navigation. Astronauts live and work on space stations.",
        r: "Nigeria launched NigeriaSat-1 in 2003. The National Space Research and Development Agency (NASRDA) runs the space programme. Your phone GPS uses satellites.",
        k: ["Sputnik 1 (1957) was the first artificial satellite.", "Yuri Gagarin was the first person in space (1961).", "Rockets carry satellites into orbit.", "Space debris is a growing problem."],
        e: ["What carries a satellite into orbit?", ["It needs a powerful engine.", "A rocket."], "A rocket"],
        d: D.cards("Uses of satellites", [["Communication", "TV, phone and internet signals"], ["Weather", "pictures of clouds and storms"], ["Navigation", "GPS shows position"], ["Observation", "NigeriaSat-1 images of land"]]),
        m: "Thinking satellites float because there is no gravity in space. Gravity keeps them in orbit."
    }, {
        pairs: [["satellite", "an object that orbits a larger body in space"], ["artificial satellite", "a machine launched into orbit by people"], ["rocket", "a vehicle with powerful engines that travels into space"], ["space probe", "an unmanned spacecraft sent to study planets"], ["astronaut", "a person trained to travel in space"], ["space station", "a large spacecraft where astronauts live and work"], ["communication satellite", "a satellite that sends TV, phone and internet signals"], ["weather satellite", "a satellite that takes pictures of clouds and storms"], ["GPS satellite", "a satellite that helps to find the position of a phone or vehicle"], ["NigeriaSat-1", "the first Earth-observation satellite of Nigeria, launched in 2003", 0], ["NASRDA", "the National Space Research and Development Agency of Nigeria", 0], ["Yuri Gagarin", "the first human being in space", 0], ["Sputnik 1", "the first artificial satellite, launched in 1957", 0], ["space debris", "old satellites and broken pieces left orbiting the Earth", 0], ["launch pad", "the platform from which a rocket takes off"], ["orbit", "the curved path of a satellite around a larger body"]]
    });
})(typeof window !== 'undefined' ? window : globalThis);
