/* CleverMent My Learning Space - Primary 6 BST, Batch 3: Basic Technology; ICT; Health, Safety and PE. Needs learning-bst.js and learning-bst2.js. */
(function (root) {
    if (!root.CMLearnBst) return;
    var h = root.CMLearnBst.h, X = h.X, S = h.S, D = h.D, numQ = h.numQ, fmt = h.fmt, P = h.P, ri = h.ri, cap = h.cap;
    var D3 = h.D3 = h.D3 || {};
    D3.house = function () {
        var b = D.title('Parts of a simple building');
        b += '<rect x="20" y="170" width="300" height="34" fill="#a16207" fill-opacity=".3"/><rect x="90" y="176" width="160" height="22" fill="#94a3b8"/><rect x="100" y="96" width="140" height="74" fill="#fcd34d" stroke="#92400e" stroke-width="2"/><path d="M84 96 L170 48 L256 96 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="2"/><rect x="156" y="124" width="28" height="46" fill="#92400e"/><rect x="112" y="108" width="28" height="22" fill="#bae6fd" stroke="#0369a1"/>';
        b += D.lab(170, 62, 276, 44, 'Roof', 0, 14) + D.lab(236, 130, 282, 112, 'Wall', 0, 14) + D.lab(170, 187, 250, 196, 'Foundation', 0, 14) + D.lab(126, 108, 96, 84, 'Window', 'end', 14);
        return D.wrap(222, b);
    };
    D3.cube = function () {
        var b = D.title('Isometric drawing of a cube');
        b += '<path d="M170 60 L230 95 L170 130 L110 95 Z" fill="#bfdbfe" stroke="#1e3a8a" stroke-width="2"/><path d="M110 95 L170 130 L170 200 L110 165 Z" fill="#93c5fd" stroke="#1e3a8a" stroke-width="2"/><path d="M230 95 L170 130 L170 200 L230 165 Z" fill="#60a5fa" stroke="#1e3a8a" stroke-width="2"/>' + D.txt(170, 224, 'Edges are drawn at 30 degrees to the horizontal', 11, '#475569', 0, 'middle');
        return D.wrap(238, b);
    };
    D3.computer = function () {
        var b = D.title('Main parts of a computer');
        b += '<rect x="100" y="40" width="140" height="90" rx="6" fill="#1e293b"/><rect x="108" y="48" width="124" height="74" fill="#38bdf8"/><rect x="160" y="130" width="20" height="14" fill="#64748b"/><rect x="140" y="144" width="60" height="6" fill="#64748b"/><rect x="90" y="162" width="130" height="26" rx="4" fill="#e2e8f0" stroke="#64748b"/><rect x="236" y="168" width="18" height="26" rx="9" fill="#e2e8f0" stroke="#64748b"/><rect x="262" y="60" width="46" height="84" rx="4" fill="#cbd5e1" stroke="#64748b"/>';
        b += D.lab(170, 80, 62, 62, 'Monitor (output)', 'end', 12) + D.lab(150, 176, 70, 206, 'Keyboard (input)', 'end', 12) + D.lab(245, 181, 326, 202, 'Mouse (input)', 'end', 12) + D.lab(285, 128, 316, 152, 'System unit', 'end', 12);
        return D.wrap(214, b);
    };
    D3.flowchart = function () {
        var b = D.title('A flowchart');
        b += '<rect x="130" y="34" width="80" height="26" rx="13" fill="#bbf7d0" stroke="#16a34a"/>' + D.txt(170, 52, 'Start', 12, '#0f172a', 1, 'middle') + D.arrow(170, 61, 170, 78) + '<rect x="120" y="80" width="100" height="28" fill="#dbeafe" stroke="#2563eb"/>' + D.txt(170, 98, 'Input a number', 11.5, '#0f172a', 1, 'middle') + D.arrow(170, 109, 170, 126) + '<path d="M170 128 L222 156 L170 184 L118 156 Z" fill="#fef9c3" stroke="#ca8a04"/>' + D.txt(170, 160, 'Even?', 12, '#0f172a', 1, 'middle') + D.arrow(222, 156, 262, 156) + D.txt(240, 148, 'Yes', 10.5, '#16a34a', 1, 'middle') + '<rect x="262" y="142" width="62" height="28" fill="#dbeafe" stroke="#2563eb"/>' + D.txt(293, 160, 'Say even', 10.5, '#0f172a', 1, 'middle') + D.arrow(118, 156, 78, 156) + D.txt(100, 148, 'No', 10.5, '#dc2626', 1, 'middle') + '<rect x="14" y="142" width="64" height="28" fill="#dbeafe" stroke="#2563eb"/>' + D.txt(46, 160, 'Say odd', 10.5, '#0f172a', 1, 'middle') + D.txt(170, 210, 'Oval: start or stop. Box: step. Diamond: question.', 10.5, '#475569', 0, 'middle');
        return D.wrap(226, b);
    };
    D3.grid = function () {
        var b = D.title('A spreadsheet'), cols = ['A', 'B', 'C'], vals = [['Name', 'Maths', 'English'], ['Ada', '70', '65'], ['Tunde', '80', '75'], ['Total', '=B2+B3', '=C2+C3']];
        b += '<rect x="40" y="40" width="30" height="24" fill="#e2e8f0" stroke="#94a3b8"/>';
        cols.forEach(function (c, i) { b += '<rect x="' + (70 + i * 80) + '" y="40" width="80" height="24" fill="#e2e8f0" stroke="#94a3b8"/>' + D.txt(110 + i * 80, 57, c, 12, '#0f172a', 1, 'middle'); });
        vals.forEach(function (r, j) { b += '<rect x="40" y="' + (64 + j * 26) + '" width="30" height="26" fill="#e2e8f0" stroke="#94a3b8"/>' + D.txt(55, 82 + j * 26, j + 1, 12, '#0f172a', 1, 'middle'); r.forEach(function (v, i) { b += '<rect x="' + (70 + i * 80) + '" y="' + (64 + j * 26) + '" width="80" height="26" fill="' + (j === 3 && i > 0 ? '#fef9c3' : '#fff') + '" stroke="#94a3b8"/>' + D.txt(110 + i * 80, 82 + j * 26, v, 11.5, '#0f172a', j === 0 ? 1 : 0, 'middle'); }); });
        b += D.txt(170, 192, 'Cell B2 is in column B and row 2', 11, '#475569', 0, 'middle');
        return D.wrap(206, b);
    };
    D3.network = function () {
        var b = D.title('A computer network'), pts = [[60, 80], [60, 160], [280, 80], [280, 160]];
        pts.forEach(function (p) { b += '<path d="M' + p[0] + ' ' + p[1] + ' L170 120" stroke="#64748b" stroke-width="2"/><rect x="' + (p[0] - 22) + '" y="' + (p[1] - 14) + '" width="44" height="28" rx="4" fill="#dbeafe" stroke="#2563eb"/>' + D.txt(p[0], p[1] + 4, 'PC', 11, '#0f172a', 1, 'middle'); });
        b += '<rect x="140" y="104" width="60" height="32" rx="6" fill="#fde68a" stroke="#ca8a04" stroke-width="2"/>' + D.txt(170, 124, 'Router', 11.5, '#0f172a', 1, 'middle') + D.txt(170, 198, 'Devices linked together can share files and internet', 10.5, '#475569', 0, 'middle');
        return D.wrap(212, b);
    };
    D3.plate = function () {
        var b = D.title('A balanced plate'), cx = 220, cy = 116, r = 70, parts = [['Carbohydrates', 0.35, '#f59e0b'], ['Vegetables and fruit', 0.35, '#22c55e'], ['Protein', 0.2, '#dc2626'], ['Fats and oils', 0.1, '#eab308']], a0 = -Math.PI / 2, leg = 36;
        parts.forEach(function (p) { var a1 = a0 + p[1] * 2 * Math.PI, x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1); b += '<path d="M' + cx + ' ' + cy + ' L' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + (p[1] > 0.5 ? 1 : 0) + ' 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' Z" fill="' + p[2] + '" stroke="#fff" stroke-width="2"/>'; a0 = a1; });
        parts.forEach(function (p, i) { b += '<rect x="8" y="' + (36 + i * 18) + '" width="10" height="10" fill="' + p[2] + '"/>' + D.txt(22, 45 + i * 18, p[0], 10, '#0f172a'); });
        b += D.txt(170, 206, 'Plus clean water and enough rest', 11, '#475569', 0, 'middle');
        return D.wrap(220, b);
    };
    D3.road = function () {
        var b = D.title('Crossing the road safely'); b += '<rect x="20" y="90" width="300" height="70" fill="#475569"/>';
        for (var i = 0; i < 6; i++) b += '<rect x="' + (110 + i * 22) + '" y="96" width="12" height="58" fill="#fff"/>';
        b += '<rect x="20" y="70" width="300" height="20" fill="#cbd5e1"/><rect x="20" y="160" width="300" height="20" fill="#cbd5e1"/>' + D.txt(170, 62, 'Look right, left, right. Listen. Then cross.', 11, '#0f172a', 1, 'middle') + D.txt(170, 204, 'Use the zebra crossing or a footbridge', 11, '#475569', 0, 'middle');
        return D.wrap(218, b);
    };
    D3.firstaid = function () {
        var b = D.title('First aid box'); b += '<rect x="90" y="50" width="160" height="110" rx="10" fill="#fff" stroke="#dc2626" stroke-width="3"/><rect x="160" y="70" width="20" height="70" fill="#dc2626"/><rect x="135" y="95" width="70" height="20" fill="#dc2626"/>' + D.txt(170, 186, 'Bandage, plaster, gauze, antiseptic, gloves, scissors', 10.5, '#0f172a', 0, 'middle');
        return D.wrap(204, b);
    };
    S("Basic Technology");

    X("technology-society", "Technology and society", {
        i: "Technology is the use of knowledge, tools and skills to solve problems and make life easier. Inventions such as the wheel, the telephone and the computer have changed how people live, travel, learn and work.",
        r: "A farmer uses a tractor, a trader uses a phone to receive payment and a student uses a computer to learn. Each is technology at work.",
        k: ["Technology solves problems and saves time and effort.", "Tools and machines are products of technology.", "Technology has good and bad effects.", "Appropriate technology suits the people who use it."],
        e: ["Name one technology that helps farmers.", ["Think of a machine that ploughs land.", "A tractor does the work of many people."], "A tractor"],
        d: D.cards("Technology around us", [["Communication", "phone, radio, television, internet"], ["Transport", "car, bus, train, aeroplane, ship"], ["Farming", "tractor, plough, irrigation pump"], ["Health", "thermometer, X-ray machine, vaccine"]]),
        m: "Thinking technology means only computers. A hoe, a pot and a pencil are technology too.",
        more: [["How technology changed life", "Long ago people walked for days to deliver a message. Today a phone call or text takes seconds. Machines now do heavy work in farms and factories, and medicines and machines help doctors save lives."], ["Good and bad effects", "Technology brings speed, comfort, jobs and knowledge. It can also cause pollution, accidents, job losses for some workers and too much time spent on screens. Good users choose technology wisely and safely."]],
        act: ["List technology in your home", ["Walk round your home or classroom.", "Write down ten things made by technology.", "Group them as communication, transport, cooking or learning.", "Say which one you could not live without and why."]],
        sum: "Technology is knowledge and tools used to solve problems. It helps us but must be used carefully."
    }, {
        cats: { "communication device": ["radio", "telephone", "television", "newspaper", "satellite dish", "email"], "transport device": ["car", "aeroplane", "ship", "train", "bicycle", "motorcycle"], "farming device": ["tractor", "plough", "irrigation pump", "harvester", "planter", "sprayer"] },
        pairs: [["technology", "the use of knowledge, tools and skills to solve problems", 0], ["tool", "a simple device used by hand to do work"], ["machine", "a device with moving parts that makes work easier"], ["invention", "a new device or idea made for the first time"], ["inventor", "a person who makes something new for the first time"], ["innovation", "an improvement on something that already exists", 0], ["craftsman", "a person skilled in making things by hand"], ["engineer", "a person who designs and builds machines, roads or structures"], ["technician", "a person trained to repair and look after machines"], ["artisan", "a skilled worker such as a carpenter or a tailor"], ["automation", "the use of machines to do work without people", 0], ["prototype", "the first model of a new invention"], ["patent", "a legal right that stops others from copying an invention"], ["appropriate technology", "technology that suits the needs, money and skills of the people using it", 0], ["obsolete", "no longer used because something better exists", 0], ["research", "careful study to find out new facts", 0]]
    });

    X("local-technology", "Local technology", {
        i: "Local (traditional) technology is skill and craft that Nigerians developed from local materials: pottery, weaving, dyeing, blacksmithing, carving, leatherwork and bronze casting.",
        r: "Pots from clay, adire cloth dyed with indigo, aso oke woven on a loom, and the Benin bronzes are all local technology.",
        k: ["Pottery: shaping clay and baking it in a kiln or open fire.", "Weaving: making cloth on a loom.", "Blacksmithing: shaping hot iron with a hammer and anvil.", "Dyeing: colouring cloth, e.g. adire with indigo."],
        e: ["Which craft uses an anvil and a forge?", ["Metal is heated and hammered.", "The craft is blacksmithing."], "Blacksmithing"],
        d: D.cards("Nigerian crafts", [["Pottery", "clay pots, baked hard"], ["Weaving", "aso oke, raffia mats on a loom"], ["Dyeing", "adire with indigo"], ["Blacksmithing", "hoes, cutlasses, knives"], ["Bronze casting", "Benin and Igbo-Ukwu bronzes"]]),
        m: "Thinking local technology is outdated. Many local crafts still earn money and are loved around the world.",
        more: [["Materials from the land", "Local crafts use materials found nearby: clay for pots, cotton and raffia for cloth and mats, iron ore for tools, leather for bags and sandals, and wood and calabash for bowls and carvings."], ["Famous Nigerian crafts", "The Nok culture made clay figures about 2,000 years ago. The Igbo-Ukwu and Benin artists cast fine bronze objects. Kano is known for leather goods and the Yoruba for adire and aso oke cloth."]],
        act: ["Make a small clay pot", ["Collect some clean clay and remove stones.", "Add a little water and knead it until smooth.", "Shape a small pot with your thumbs.", "Let it dry in the shade for several days."]],
        sum: "Local technology uses local materials and skills to make useful and beautiful things."
    }, {
        pairs: [["pottery", "the craft of making pots and dishes from baked clay", 0], ["weaving", "the craft of making cloth by crossing threads on a loom", 0], ["blacksmithing", "the craft of shaping iron by heating and hammering it", 0], ["dyeing", "the craft of colouring cloth or thread", 0], ["carving", "the craft of cutting wood or stone into shapes", 0], ["leatherwork", "the craft of making goods such as bags and sandals from animal skin", 0], ["loom", "a frame used for weaving cloth"], ["adire", "a tie-and-dye cloth made by the Yoruba people", 0], ["aso oke", "a hand-woven cloth of the Yoruba people", 0], ["Benin bronze", "a bronze or brass sculpture made by the Edo people of Benin", 0], ["Nok culture", "an ancient culture known for its clay sculptures", 0], ["forge", "a furnace where a blacksmith heats metal"], ["anvil", "a heavy iron block on which hot metal is hammered"], ["bellows", "a tool that blows air into a fire to make it hotter"], ["kiln", "a hot oven used to bake clay pots"], ["indigo", "a blue dye made from the indigo plant", 0]]
    });

    X("hand-tools", "Hand tools", {
        i: "Hand tools are simple tools worked by hand. Each has a special job: hammers drive nails, saws cut, planes smooth, chisels shape, screwdrivers turn screws, spanners turn nuts and pliers grip.",
        r: "A carpenter uses a handsaw to cut a plank and a plane to smooth it. A mechanic uses a spanner to remove a wheel nut.",
        k: ["Cutting tools: handsaw, hacksaw, chisel.", "Striking tools: hammer, mallet.", "Measuring tools: rule, tape, try square.", "Keep tools clean, sharp and in their place."],
        e: ["Which tool is used to cut metal?", ["A saw with fine teeth.", "The hacksaw."], "Hacksaw"],
        d: D.table("Common hand tools", ["Tool", "Job"], [["Handsaw", "cuts wood"], ["Hacksaw", "cuts metal"], ["Plane", "smooths wood"], ["Chisel", "cuts grooves"], ["Spanner", "turns nuts"]]),
        m: "Using a screwdriver as a chisel. Use each tool only for its own job.",
        more: [["Caring for tools", "Wipe tools clean after use, keep cutting edges sharp, oil metal tools lightly to stop rust and store them in a rack or box. Never leave tools on the floor."], ["Using tools safely", "Hold the work firmly in a vice, cut away from your body, and keep fingers behind the cutting edge. Carry sharp tools with the point down."]],
        act: ["Tool match-up", ["Draw five tools in your notebook.", "Write the job of each tool beside it.", "Say which material each tool works on: wood, metal or both."]],
        sum: "Each hand tool has its own job. Using the right tool safely makes work easy and accurate."
    }, {
        ctx: "tool",
        pairs: [["hammer", "drive nails into wood"], ["handsaw", "cut wood"], ["hacksaw", "cut metal"], ["plane", "smooth the surface of wood"], ["chisel", "cut grooves and shapes in wood"], ["screwdriver", "turn screws"], ["spanner", "tighten or loosen nuts and bolts"], ["pliers", "grip and bend wire"], ["file", "smooth rough edges of metal"], ["try square", "check that corners are right angles"], ["tape measure", "measure long lengths"], ["spirit level", "check whether a surface is flat or upright"], ["vice", "hold a work piece firmly"], ["hand drill", "make holes"], ["mallet", "strike a chisel without damaging its handle"], ["trowel", "spread mortar or plaster"]]
    });

    X("workshop-safety", "Workshop safety", {
        i: "A workshop has sharp tools, heavy machines and hot materials. Safety rules and protective clothing prevent accidents. A hazard is anything that can cause harm; an accident is an unplanned event that causes injury.",
        r: "A welder wears goggles and gloves. A carpenter wears an apron and a dust mask. A workshop has a first aid box and a fire extinguisher.",
        k: ["Wear goggles, apron, gloves and safety boots.", "Keep the floor clean and tools in place.", "Never run or play in the workshop.", "Know where the first aid box and exit are."],
        e: ["Why do we wear goggles when grinding metal?", ["Sparks and chips fly.", "They protect the eyes."], "To protect the eyes from chips and sparks"],
        d: D.cards("Protective wear", [["Goggles", "eyes"], ["Dust mask", "lungs"], ["Gloves", "hands"], ["Safety boots", "feet"], ["Ear protectors", "ears"]]),
        m: "Thinking accidents just happen. Most accidents come from careless behaviour and can be prevented.",
        more: [["Common hazards", "Sharp edges, flying chips, hot metal, loose clothing near machines, wet floors, loud noise, dust and fumes, and electric faults are common hazards in a workshop."], ["If an accident happens", "Stay calm, switch off the machine, call the teacher or an adult, give first aid if trained, and report the accident so that the cause can be removed."]],
        act: ["Workshop safety poster", ["Draw a workshop with five safety rules.", "Write one short sentence for each rule.", "Colour the danger signs red and the safe signs green."]],
        sum: "Safety rules, protective clothing and a tidy workshop prevent accidents."
    }, {
        cats: { "safe workshop practice": ["wearing goggles", "tidying tools after use", "listening to the teacher", "tying back long hair", "switching off machines after use", "reporting broken tools"], "unsafe workshop practice": ["running in the workshop", "playing with sharp tools", "wearing loose clothes near machines", "leaving tools on the floor", "using a tool without permission", "pointing a chisel at a friend"] },
        pairs: [["goggles", "eye protectors that keep dust and chips out of the eyes"], ["apron", "a covering worn over clothes to keep them clean"], ["gloves", "hand coverings that protect against cuts and heat"], ["safety boots", "strong shoes that protect the feet from falling objects"], ["ear protectors", "covers that protect the ears from loud noise"], ["dust mask", "a cover for the nose and mouth that filters dust"], ["overalls", "one-piece working clothes that cover the whole body"], ["hazard", "anything that can cause harm"], ["accident", "an unplanned event that causes injury or damage"], ["ventilation", "the flow of fresh air through a room", 0], ["safety sign", "a sign that warns of danger or gives instructions"], ["machine guard", "a cover that protects the user from moving parts"], ["first aid box", "a box of items for treating small injuries"], ["fire extinguisher", "a cylinder that puts out small fires"], ["emergency exit", "a door used to leave a building quickly in danger"], ["risk", "the chance that harm will happen"]]
    });

    X("wood-woodwork", "Wood and woodwork", {
        i: "Wood comes from trees. Hardwoods (iroko, mahogany, teak) are strong and last long. Softwoods (pine) are light and easy to cut. Timber is seasoned, cut, planed, joined and finished with varnish or paint.",
        r: "Doors and furniture are often made of iroko or mahogany. Plywood and chipboard are made from wood layers or chips glued together.",
        k: ["Hardwood: iroko, mahogany, teak.", "Softwood: pine, spruce.", "Seasoning dries timber and stops warping.", "Preservatives and varnish protect wood from termites and rot."],
        e: ["Why is timber seasoned before use?", ["Fresh timber contains water.", "Drying stops it from warping and cracking."], "To dry it and prevent warping"],
        d: D.table("Wood products", ["Product", "Made from"], [["Plank", "a tree trunk sawn lengthwise"], ["Plywood", "thin layers glued together"], ["Chipboard", "wood chips pressed with glue"], ["Veneer", "a very thin slice of fine wood"]]),
        m: "Thinking hardwood is always harder to cut than softwood. The names describe the kind of tree, not only the hardness.",
        more: [["From tree to furniture", "A tree is felled, sawn into planks, seasoned, marked out, cut, planed smooth, joined with nails, screws or glue and finished with sandpaper and varnish."], ["Wood joints", "Simple joints are the butt joint, the lap joint and the dovetail joint. A dovetail is very strong because the pieces lock together like a wedge."]],
        act: ["Wood survey", ["List five wooden things in your classroom.", "Say whether each looks like hardwood, softwood or board.", "Say how each is protected from termites and dirt."]],
        sum: "Wood is sawn, seasoned, shaped, joined and finished. Hardwoods are strong; softwoods are light."
    }, {
        cats: { "hardwood": ["iroko", "mahogany", "teak", "ebony"], "softwood": ["pine", "spruce", "fir", "cedar"] },
        pairs: [["timber", "wood that has been cut into planks and beams for building", 0], ["hardwood", "wood from broad-leaved trees that is strong and lasts long", 0], ["softwood", "wood from trees such as pine that is light and easy to cut", 0], ["plywood", "a board made of thin layers of wood glued together", 0], ["chipboard", "a board made of wood chips pressed with glue", 0], ["veneer", "a very thin slice of fine wood glued on a cheaper board", 0], ["seasoning", "drying timber slowly to stop it warping", 0], ["grain", "the pattern of lines in wood", 0], ["joint", "the place where two pieces of wood are joined"], ["dovetail joint", "a strong joint in which pieces lock together like a wedge"], ["varnish", "a clear liquid that protects wood and makes it shine", 0], ["preservative", "a chemical that protects wood from insects and rot"], ["iroko", "a strong hardwood tree grown in Nigeria", 0], ["mahogany", "a reddish hardwood used for fine furniture", 0], ["sandpaper", "a paper coated with grit used to smooth wood", 0], ["termite", "an insect that eats and damages wood"]]
    });

    X("metals-metalwork", "Metals and metalwork", {
        i: "Metals are shaped by forging, casting, cutting, filing and welding. Ferrous metals contain iron (mild steel, cast iron); non-ferrous metals do not (aluminium, copper, brass).",
        r: "A blacksmith makes a hoe by heating and hammering iron. Aluminium pots are cast in moulds. A welder joins steel gates.",
        k: ["Ferrous: contain iron and rust.", "Non-ferrous: aluminium, copper, brass.", "Joining: welding, soldering, riveting.", "Shaping: forging, casting, bending."],
        e: ["Is copper a ferrous or non-ferrous metal?", ["Does copper contain iron? No."], "Non-ferrous"],
        d: D.table("Metalwork processes", ["Process", "What happens"], [["Forging", "hot metal hammered into shape"], ["Casting", "molten metal poured into a mould"], ["Welding", "metals melted and joined"], ["Soldering", "joined with melted solder"], ["Riveting", "joined with rivets"]]),
        m: "Thinking all metals rust. Aluminium and copper do not rust like iron.",
        more: [["Heating and shaping", "Iron and steel become soft when red-hot and can be hammered (forged). Molten metal poured into a mould and left to cool makes a cast object such as an aluminium pot."], ["Joining metals", "Metals can be welded (melted together), soldered (joined with a low-melting alloy), riveted (joined with metal pins), or bolted. Rust is prevented with paint, oil or zinc coating."]],
        act: ["Metals around us", ["List five metal objects in your home.", "Test with a magnet to find which contain iron.", "Say which are ferrous and which are non-ferrous."]],
        sum: "Metals are shaped by hammering, casting and cutting and are joined by welding, soldering or riveting."
    }, {
        pairs: [["ferrous metal", "a metal that contains iron"], ["non-ferrous metal", "a metal that does not contain iron"], ["mild steel", "an iron and carbon alloy that is easy to shape and weld", 0], ["cast iron", "a hard brittle iron that is shaped by casting", 0], ["brass", "an alloy of copper and zinc", 0], ["solder", "a soft alloy that melts easily and is used to join metals", 0], ["soldering", "joining metals with melted solder", 0], ["welding", "joining metals by melting them together", 0], ["forging", "shaping hot metal by hammering", 0], ["casting", "pouring molten metal into a mould to make an object", 0], ["riveting", "joining metal sheets with metal pins", 0], ["rivet", "a metal pin used to join metal sheets"], ["sheet metal", "metal rolled into thin flat pieces", 0], ["ingot", "a block of cast metal"], ["mould", "a hollow shape that gives a form to molten metal"], ["blacksmith", "a person who shapes iron by heating and hammering it"]]
    });

    X("plastics-rubber-ceramics", "Plastics, rubber and ceramics", {
        i: "Plastics are man-made materials from petroleum. Thermoplastics soften when heated and can be reshaped; thermosetting plastics cannot. Rubber comes from latex or is made in factories. Ceramics are made by baking clay.",
        r: "Buckets are polythene, pipes are PVC, tyres are rubber and tiles and plates are ceramics.",
        k: ["Thermoplastic: softens when heated (polythene).", "Thermosetting: sets hard for ever (bakelite).", "Vulcanisation makes rubber strong.", "Ceramics: brick, tile, porcelain."],
        e: ["Which material is made by baking clay?", ["Clay turns hard in a kiln.", "Ceramics."], "Ceramic"],
        d: D.cards("Three material families", [["Plastics", "polythene bags, PVC pipes, nylon"], ["Rubber", "tyres, balls, shoe soles"], ["Ceramics", "tiles, plates, bricks, pots"]]),
        m: "Thinking plastics are natural. They are made from petroleum.",
        more: [["Making rubber", "Latex is tapped from rubber trees such as those in Edo and Delta states, heated with sulphur (vulcanisation) and shaped. Vulcanised rubber is strong and springy."], ["Plastic waste", "Plastics do not rot. They block drains and harm animals, so they should be reused and recycled and not burnt or thrown away."]],
        act: ["Material sorting", ["Collect ten household items.", "Sort them into plastic, rubber, ceramic and other.", "Say which can be recycled."]],
        sum: "Plastics, rubber and ceramics are useful materials, but plastic waste must be managed."
    }, {
        pairs: [["plastic", "a light, strong man-made material that can be moulded", 0], ["thermoplastic", "a plastic that softens when heated and can be reshaped", 0], ["thermosetting plastic", "a plastic that cannot be softened again once it has set", 0], ["polythene", "a flexible plastic used for bags and sheets", 0], ["PVC", "a hard plastic used for pipes and cables", 0], ["nylon", "a strong synthetic fibre used for ropes and clothes", 0], ["latex", "the milky juice tapped from rubber trees", 0], ["vulcanisation", "heating rubber with sulphur to make it stronger", 0], ["synthetic rubber", "rubber made in factories from petroleum", 0], ["ceramic", "a hard material made by baking clay"], ["porcelain", "a fine white ceramic used for plates and toilets", 0], ["earthenware", "ordinary pottery made of baked clay", 0], ["tile", "a thin flat ceramic piece used to cover floors and walls"], ["firing", "baking clay at a high temperature to harden it", 0], ["glaze", "a glassy coating on pottery"], ["moulding", "shaping a material by pouring or pressing it into a mould", 0]]
    });

    X("measuring-marking", "Measuring and marking out", {
        i: "Accurate measuring and marking out prevent waste and mistakes. Length is measured in millimetres, centimetres, metres and kilometres using rulers and tapes. Marking tools include the pencil, scriber, marking gauge and try square.",
        r: "A tailor measures with a tape. A carpenter marks a plank with a pencil and try square before cutting. A metalworker uses a scriber.",
        k: ["10 mm = 1 cm; 100 cm = 1 m; 1000 m = 1 km.", "Measure twice, cut once.", "Read the ruler at eye level.", "Use a scriber on metal and a pencil on wood."],
        e: ["Convert 3 m to centimetres.", ["1 m = 100 cm.", "3 x 100 = 300."], "300 cm"],
        d: D.table("Units of length", ["Unit", "Equal to"], [["1 cm", "10 mm"], ["1 m", "100 cm"], ["1 km", "1000 m"]]),
        m: "Measuring from the end of a worn ruler. Start from a clear mark such as 1 cm and subtract.",
        more: [["Marking out", "Marking out means drawing guide lines on the material before cutting. Use a try square for right angles, a marking gauge for lines parallel to an edge and dividers for equal spaces."], ["Accuracy", "An accurate measurement is close to the true value. Use sharp pencils, keep the rule flat on the work and look straight down at the mark to avoid errors."]],
        act: ["Measure your desk", ["Measure the length and width of your desk in cm.", "Convert both to millimetres and to metres.", "Check your answers with a partner."]],
        sum: "Use the correct tool and unit, read carefully, and mark out accurately before cutting."
    }, {
        gens: [function (r) { var n = ri(r, 2, 95); return numQ(r, 'Convert ' + n + ' cm to millimetres.', n * 10, [n, n * 100, n / 10 + 10], 'mm', '1 cm = 10 mm, so ' + n + ' x 10 = ' + (n * 10) + ' mm.', 'cm2mm' + n); }, function (r) { var n = ri(r, 2, 40); return numQ(r, 'Convert ' + n + ' m to centimetres.', n * 100, [n * 10, n * 1000, n + 100], 'cm', '1 m = 100 cm, so ' + n + ' x 100 = ' + (n * 100) + ' cm.', 'm2cm' + n); }, function (r) { var n = ri(r, 2, 30); return numQ(r, 'Convert ' + n + ' km to metres.', n * 1000, [n * 100, n * 10, n + 1000], 'm', '1 km = 1000 m, so ' + n + ' x 1000 = ' + (n * 1000) + ' m.', 'km2m' + n); }, function (r) { var n = 10 * ri(r, 2, 90); return numQ(r, 'Convert ' + n + ' mm to centimetres.', n / 10, [n * 10, n / 100 + 1, n / 10 + 10], 'cm', '10 mm = 1 cm, so ' + n + ' / 10 = ' + (n / 10) + ' cm.', 'mm2cm' + n); }],
        pairs: [["ruler", "a flat strip marked in centimetres and millimetres"], ["tape measure", "a flexible strip used to measure long lengths and curved things"], ["protractor", "an instrument for measuring angles"], ["try square", "a tool used to mark and check right angles"], ["marking gauge", "a tool for marking a line parallel to an edge"], ["scriber", "a pointed steel tool for marking lines on metal"], ["centre punch", "a tool that makes a small dent to guide a drill"], ["dividers", "a tool with two points for marking equal distances"], ["calliper", "an instrument for measuring thickness or small distances"], ["millimetre", "one thousandth of a metre"], ["centimetre", "one hundredth of a metre"], ["metre", "the basic unit of length"], ["kilometre", "one thousand metres"], ["accuracy", "how close a measurement is to the true value", 0], ["set square", "a triangular tool for drawing angles of 30, 45, 60 or 90 degrees"], ["marking out", "drawing guide lines on material before cutting", 0]]
    });

    X("technical-drawing", "Technical drawing", {
        i: "Technical drawing is drawing with instruments to show exact shapes, sizes and details so that others can make the object. It uses standard lines: outline, dimension, centre, hidden and construction lines.",
        r: "A builder follows a plan drawn by an architect. A tailor or carpenter works from a drawing with measurements.",
        k: ["Use a hard pencil (H) for thin lines.", "Outline: thick; hidden: dashed; centre: long and short dashes.", "Dimension lines show sizes.", "A scale shows how the drawing relates to the real object."],
        e: ["Which line shows parts you cannot see?", ["It is made of short dashes.", "Hidden line."], "Hidden line"],
        d: D.table("Types of line", ["Line", "Looks like"], [["Outline", "thick, continuous"], ["Hidden", "short dashes"], ["Centre", "long and short dashes"], ["Dimension", "thin with arrowheads"], ["Construction", "faint, thin"]]),
        m: "Drawing every line equally dark. Use thick outlines and thin construction lines.",
        more: [["Drawing instruments", "A drawing board, T-square and set squares make straight and parallel lines. A compass draws circles and arcs, a protractor measures angles and an eraser removes mistakes."], ["Views of an object", "The plan is the view from above. The front elevation is the view from the front and the side elevation is the view from the side. Together they describe the object fully."]],
        act: ["Draw a rectangle plan", ["Draw a border 1 cm from the edges.", "Draw a 8 cm by 5 cm rectangle with a hard pencil.", "Add dimension lines with arrowheads.", "Add a title block with your name and the scale."]],
        sum: "Technical drawing uses instruments and standard lines to show shapes and sizes exactly."
    }, {
        pairs: [["technical drawing", "drawing with instruments to show exact shapes and sizes", 0], ["drawing board", "a smooth flat board on which drawing paper is fixed"], ["T-square", "a ruler with a crosspiece used to draw horizontal lines"], ["set square", "a triangular tool for drawing angles and perpendicular lines"], ["drawing compass", "an instrument for drawing circles and arcs"], ["outline", "a thick continuous line showing the edges of an object"], ["dimension line", "a thin line with arrowheads that shows a measurement"], ["centre line", "a thin line of long and short dashes showing the centre of a shape"], ["hidden line", "a line of short dashes showing parts that cannot be seen"], ["construction line", "a faint thin line used to set out a drawing"], ["scale", "the ratio of the size in the drawing to the real size"], ["title block", "a box on a drawing giving its title, scale and the name of the draughtsman"], ["elevation", "a drawing of an object seen from the front or side"], ["plan", "a drawing of an object seen from above"], ["H pencil", "a hard pencil that makes thin light lines"], ["HB pencil", "a medium pencil used for general lines and lettering"]]
    });

    X("pictorial-drawing", "Pictorial drawing", {
        i: "A pictorial drawing shows an object as it looks in three dimensions (length, width and height). Common types are isometric drawing (edges at 30 degrees), oblique drawing and perspective drawing.",
        r: "A picture of a box in a catalogue or a furniture advert is a pictorial drawing. Artists use perspective to show a road narrowing into the distance.",
        k: ["Isometric: vertical lines upright and other edges at 30 degrees.", "Oblique: front face true shape; depth lines at an angle.", "Perspective: things look smaller further away.", "Sketching is quick freehand drawing."],
        e: ["At what angle are the sloping edges in an isometric drawing?", ["Isometric means equal measure.", "The sloping edges are at 30 degrees."], "30 degrees"],
        d: D3.cube(),
        m: "Drawing the back edges as solid lines. In many drawings hidden edges are left out or dashed.",
        more: [["Common solid shapes", "A cube has six equal square faces. A cuboid has six rectangular faces. A cylinder has two circular ends, a cone has a point and a circular base, and a sphere is round like a ball."], ["Shading", "Light shading on one side makes a drawing look solid. Keep shading smooth and in one direction."]],
        act: ["Draw a box", ["Draw a square of 5 cm for the front face.", "Draw three parallel lines at 45 degrees from the corners.", "Join the ends to complete an oblique box.", "Shade one side lightly."]],
        sum: "Pictorial drawings show solid objects as the eye sees them using isometric, oblique or perspective methods."
    }, {
        pairs: [["pictorial drawing", "a drawing that shows an object as it looks in three dimensions", 0], ["isometric drawing", "a pictorial drawing with edges drawn at 30 degrees", 0], ["oblique drawing", "a pictorial drawing with the front face drawn true shape and depth lines at an angle", 0], ["perspective drawing", "a drawing in which things look smaller as they go further away", 0], ["vanishing point", "the point where parallel lines seem to meet in a perspective drawing"], ["cuboid", "a box shape with six rectangular faces"], ["cylinder", "a solid shape with two circular ends and a curved side"], ["cone", "a solid shape with a circular base and a point at the top"], ["sphere", "a perfectly round solid shape like a ball"], ["pyramid", "a solid shape with a flat base and sloping sides that meet at a point"], ["sketch", "a quick rough drawing"], ["freehand drawing", "drawing without using instruments", 0], ["shading", "dark marks that give a drawing a solid look", 0], ["three dimensions", "length, width and height", 0], ["depth", "the distance from the front to the back of an object", 0], ["horizon line", "the line where the sky seems to meet the ground"]]
    });

    X("building-construction", "Building and construction", {
        i: "Building starts with a plan, a foundation, then walls, a roof and finishing. Materials include cement, sand, gravel, blocks, steel bars, timber and roofing sheets. Concrete is cement, sand, gravel and water.",
        r: "Look at a new house being built: workers dig the foundation, lay blocks with mortar, fix a lintel above doors and put on the roof.",
        k: ["Foundation supports the whole building.", "Mortar joins blocks; concrete is for floors and beams.", "Lintel is a beam over a door or window.", "A damp-proof course stops water rising in walls."],
        e: ["What holds up the whole building?", ["It is below the ground.", "The foundation."], "The foundation"],
        d: D3.house(),
        m: "Skipping the foundation or using too little cement. A weak mix can cause the building to crack or collapse.",
        more: [["Building materials", "Sandcrete blocks, bricks, cement, sand, gravel, iron rods, timber, roofing sheets, paint and tiles are common materials. Choose them for strength, cost and local supply."], ["People in building", "An architect designs the building. The engineer checks its strength. Bricklayers, carpenters, plumbers, electricians and painters build and finish it."]],
        act: ["Mix mortar (with an adult)", ["Measure 1 part cement and 4 parts sand.", "Mix them dry on a flat surface.", "Add a little water and mix to a thick paste.", "Use it to join two blocks."]],
        sum: "A building needs a plan, a strong foundation, good materials and skilled workers."
    }, {
        pairs: [["foundation", "the base that supports a building and sits under the ground"], ["damp-proof course", "a layer that stops water rising up a wall"], ["lintel", "a beam over a door or window"], ["rafter", "a sloping beam that holds up the roof"], ["concrete", "a mixture of cement, sand, gravel and water", 0], ["mortar", "a mixture of cement, sand and water used to join blocks", 0], ["plaster", "a smooth coat spread on walls", 0], ["reinforcement", "steel bars placed in concrete to make it stronger", 0], ["architect", "a person who designs buildings"], ["bricklayer", "a worker who builds walls with bricks or blocks"], ["scaffold", "a temporary frame used to reach high parts of a building"], ["building plan", "a drawing that shows the size and layout of a building"], ["roof", "the top covering of a building"], ["ceiling", "the inside surface above the room"], ["sandcrete block", "a building block made of sand, cement and water"], ["gravel", "small stones used in concrete", 0]]
    });

    X("technology-environment", "Technology and the environment", {
        i: "Technology can harm or help the environment. Factories, vehicles and burning waste cause pollution. Green technology such as solar power, recycling and water treatment protects the environment.",
        r: "Gas flaring in the Niger Delta pollutes air. Solar street lights use clean energy. A recycling plant turns plastic bottles into new products.",
        k: ["Harmful: pollution, waste, deforestation.", "Helpful: solar power, recycling, water treatment.", "Sustainable technology meets today needs without harming the future.", "Reduce your carbon footprint."],
        e: ["Name one technology that protects the environment.", ["It should give clean energy.", "Solar panels."], "Solar panels or recycling"],
        d: D.cards("Technology and nature", [["Harms", "pollution, waste, cutting trees"], ["Helps", "solar power, recycling, treatment plants"], ["Aim", "sustainable technology"]]),
        m: "Thinking technology is always bad for nature. Used well, it can protect and repair the environment.",
        more: [["Green technology", "Solar panels, wind turbines, biogas plants and electric vehicles give energy with less pollution. Water treatment and recycling plants clean up waste."], ["What can pupils do", "Switch off unused lights, reuse and recycle, plant trees, pick up litter and use water carefully. Small actions by many people make a big difference."]],
        act: ["Environmental audit", ["Walk round your school.", "List three technologies that harm the environment and three that help.", "Suggest one improvement for the school."]],
        sum: "Technology should be chosen and used so that it protects the environment now and in the future."
    }, {
        cats: { "positive effect of technology": ["faster communication", "better medicine", "cleaner energy from the sun", "more food from farms", "easier travel", "access to information"], "negative effect of technology": ["air pollution", "plastic waste", "noise from machines", "job losses from automation", "electronic waste", "road accidents"] },
        pairs: [["pollution", "harmful substances that make air, water or soil dirty", 0], ["sustainable technology", "technology that meets our needs without harming the future", 0], ["green technology", "technology that helps to protect the environment", 0], ["e-waste", "old electrical items such as phones and radios that are thrown away", 0], ["recycling plant", "a factory that turns used materials into new products"], ["biogas plant", "a plant that turns waste into gas for cooking and power"], ["water treatment plant", "a plant that cleans water so it is safe to drink"], ["carbon footprint", "the amount of carbon dioxide produced by a person or activity"], ["environmental impact", "the effect of an activity on the environment", 0], ["noise pollution", "harmful or annoying loud sound in the environment", 0], ["solar power", "electricity made from sunlight", 0], ["wind turbine", "a machine that changes the energy of wind into electricity"], ["electric vehicle", "a vehicle that runs on electricity instead of petrol"], ["gas flaring", "the burning of unwanted gas at oil wells", 0], ["landfill", "a large hole in the ground where waste is buried"], ["conservation", "the wise use and protection of natural resources", 0]]
    });

    X("inventions-inventors", "Inventions and inventors", {
        i: "An invention is a new device or idea. Inventors and scientists have changed the world: the telephone, the electric lamp, the aeroplane, the radio, the printing press, the television, the computer and the internet.",
        r: "A phone call, a light switch, a flight and a book all come from inventions. Vaccines and X-rays came from scientists who studied nature carefully.",
        k: ["Bell: telephone. Edison: practical light bulb.", "Wright brothers: powered flight (1903).", "Gutenberg: printing press. Marconi: radio.", "Tim Berners-Lee: World Wide Web."],
        e: ["Who invented the telephone?", ["He made the first practical telephone.", "Alexander Graham Bell."], "Alexander Graham Bell"],
        d: D.table("Inventors", ["Inventor", "Invention"], [["Bell", "telephone"], ["Edison", "practical light bulb"], ["Wright brothers", "aeroplane"], ["Marconi", "radio"], ["Berners-Lee", "World Wide Web"]]),
        m: "Thinking one person alone invents everything. Most inventions build on the work of many people.",
        more: [["Medicine and science", "Edward Jenner developed the first vaccine. Louis Pasteur showed that heating can kill germs. Alexander Fleming discovered penicillin and Marie Curie studied radioactivity."], ["Becoming an inventor", "Inventors notice a problem, think of ideas, build a model, test it and improve it. Patience and curiosity matter more than expensive tools."]],
        act: ["Invent something", ["Choose a problem at home or school.", "Draw your idea and label its parts.", "List the materials you would use.", "Explain how it would help people."]],
        sum: "Inventions solve problems. Many inventors, including scientists in Africa today, continue to improve our lives."
    }, {
        pairs: [["Alexander Graham Bell", "the inventor of the telephone", 0], ["Thomas Edison", "the inventor of the practical electric light bulb", 0], ["Wright brothers", "the first people to fly a powered aeroplane, in 1903", 0], ["Johannes Gutenberg", "the inventor of the printing press in Europe", 0], ["Guglielmo Marconi", "a pioneer of radio", 0], ["Tim Berners-Lee", "the inventor of the World Wide Web", 0], ["James Watt", "the engineer who improved the steam engine", 0], ["Karl Benz", "the builder of the first practical petrol car", 0], ["Alexander Fleming", "the scientist who discovered penicillin", 0], ["Louis Pasteur", "the scientist who showed that heat can kill germs in milk", 0], ["Marie Curie", "the scientist who discovered radium and polonium", 0], ["Samuel Morse", "the inventor of the telegraph and Morse code", 0], ["Wilhelm Roentgen", "the scientist who discovered X-rays", 0], ["Edward Jenner", "the doctor who developed the first vaccine, against smallpox", 0], ["John Logie Baird", "the inventor who showed the first working television", 0], ["Isaac Newton", "the scientist who explained gravity and the laws of motion", 0]]
    });
})(typeof window !== 'undefined' ? window : globalThis);

(function (root) {
    if (!root.CMLearnBst) return;
    var h = root.CMLearnBst.h, X = h.X, S = h.S, D = h.D, D3 = h.D3, numQ = h.numQ, P = h.P, ri = h.ri, cap = h.cap;
    S("Information and Communication Technology");

    X("what-is-computer", "What a computer is", {
        i: "A computer is an electronic machine that accepts data (input), processes it by following a program and gives results (output). It can also store information. Data is raw facts; information is data that has been processed.",
        r: "When you type 2 + 3 on a calculator app, the numbers are the input, the phone does the sum (processing) and the screen shows 5 (output).",
        k: ["Input, processing, output and storage.", "Computers work with a program (software).", "They are fast, accurate and can store much data.", "Computers use bits: 0 and 1."],
        e: ["What do we call the results shown on the screen?", ["Results come out of the computer.", "They are the output."], "Output"],
        d: D.flow("The computer cycle", ["Input (keyboard, mouse)", "Processing (the CPU follows a program)", "Output (screen, printer)", "Storage (saved on a disk)"]),
        m: "Saying a computer thinks by itself. It only follows the instructions in a program.",
        more: [["Early computing", "The abacus was an early counting tool. In the 1800s Charles Babbage designed a machine that is called the first computer idea. Modern computers use electronic parts and appeared in the 1940s."], ["Why computers are useful", "Computers are fast, accurate, can store huge amounts of information and do not get tired. They are used in schools, banks, hospitals, offices and homes."]],
        act: ["Computers around you", ["List five places where computers are used.", "Say what each one does with data.", "Say whether it is a desktop, laptop, tablet, phone or embedded computer."]],
        sum: "A computer takes input, processes it with a program, stores data and gives output."
    }, {
        pairs: [["computer", "an electronic machine that accepts data, processes it and gives results"], ["data", "raw facts and figures", 0], ["information", "data that has been processed to give meaning", 0], ["input", "data or instructions put into a computer", 0], ["processing", "the work a computer does on data", 0], ["output", "the results given by a computer", 0], ["storage", "keeping data so that it can be used later", 0], ["program", "a set of instructions that tells a computer what to do"], ["user", "a person who uses a computer"], ["digital", "using the numbers 0 and 1 to represent information", 0], ["bit", "the smallest unit of data, either 0 or 1"], ["byte", "a group of eight bits"], ["ICT", "information and communication technology", 0], ["abacus", "an early counting tool with beads"], ["Charles Babbage", "the English mathematician called the father of the computer", 0], ["microprocessor", "a tiny chip that does the processing in a computer"]]
    });

    X("parts-of-computer", "Parts of a computer", {
        i: "A computer has input devices, a system unit with the CPU (the brain), memory and storage, and output devices. The CPU processes data. RAM holds work temporarily. The hard disk stores files.",
        r: "A desktop has a monitor, keyboard, mouse and system unit. A laptop has all these built into one. A phone has them in one small body.",
        k: ["CPU: processes instructions.", "RAM: temporary working memory.", "Hard disk: permanent storage.", "Motherboard: connects all parts."],
        e: ["Which part is called the brain of the computer?", ["It processes all the instructions.", "The CPU."], "The CPU (central processing unit)"],
        d: D3.computer(),
        m: "Calling the system unit the CPU. The CPU is a small chip inside the system unit.",
        more: [["Inside the system unit", "The system unit holds the motherboard, CPU, RAM, hard disk, power supply and fan. The fan stops the parts from getting too hot."], ["Ports", "A port is a socket for plugging in a device. USB ports connect flash drives, mice and printers. An HDMI port connects a screen or projector."]],
        act: ["Label a computer", ["Draw a desktop computer.", "Label the monitor, keyboard, mouse and system unit.", "Write one job beside each part."]],
        sum: "A computer is made of input, processing, storage and output parts working together."
    }, {
        ctx: "part of a computer",
        pairs: [["CPU", "process data and carry out instructions"], ["monitor", "display text and pictures"], ["keyboard", "let us type letters and numbers"], ["mouse", "move the pointer and select items"], ["system unit", "hold the main parts of the computer"], ["motherboard", "connect all the parts of the computer"], ["RAM", "hold data and programs temporarily while the computer is on"], ["hard disk", "store files permanently"], ["power supply", "change mains electricity into the form the computer needs"], ["speaker", "give out sound"], ["printer", "produce a paper copy"], ["fan", "cool the inside of the system unit"], ["USB port", "connect devices such as flash drives"], ["webcam", "take pictures and video"], ["microphone", "record sound"], ["touchpad", "move the pointer on a laptop"]]
    });

    X("input-output", "Input and output devices", {
        i: "Input devices send data into a computer: keyboard, mouse, scanner, microphone, webcam and joystick. Output devices show or give out results: monitor, printer, speaker and projector. Storage devices keep data.",
        r: "A cashier uses a barcode reader (input) and a receipt printer (output). A teacher uses a projector to show a lesson.",
        k: ["Input: keyboard, mouse, scanner, microphone.", "Output: monitor, printer, speaker, projector.", "Touchscreens are both input and output.", "Storage: flash drive, hard disk, memory card."],
        e: ["Is a printer an input or output device?", ["It gives a paper copy.", "It gives results out."], "Output device"],
        d: D.table("Types of device", ["Input", "Output", "Storage"], [["keyboard", "monitor", "flash drive"], ["mouse", "printer", "hard disk"], ["scanner", "speaker", "memory card"], ["microphone", "projector", "CD"]]),
        m: "Thinking a touchscreen is only an input device. It gives output too.",
        more: [["Choosing a device", "Pick the device that suits the job: a scanner copies a paper into the computer, a plotter prints large drawings, and headphones let one person listen privately."], ["Looking after devices", "Keep devices dry and dust-free, do not drop them and unplug them safely."]],
        act: ["Sort the devices", ["Write ten devices on slips of paper.", "Sort them into input, output and storage.", "Check with a partner."]],
        sum: "Input devices send data in, output devices send results out and storage devices keep data."
    }, {
        cats: { "input device": ["keyboard", "mouse", "scanner", "microphone", "webcam", "joystick", "barcode reader", "digital camera"], "output device": ["monitor", "printer", "speaker", "projector", "headphones", "plotter"], "storage device": ["flash drive", "hard disk", "memory card", "compact disc"] },
        ctx: "computer device",
        pairs: [["keyboard", "enter letters, numbers and commands"], ["mouse", "point at and select things on the screen"], ["scanner", "copy a paper document or picture into the computer"], ["microphone", "record sound"], ["webcam", "capture live video"], ["joystick", "control movement in games"], ["barcode reader", "read the lines on product labels"], ["monitor", "show pictures and text on a screen"], ["printer", "make a paper copy of a document"], ["speaker", "give out sound for everyone to hear"], ["projector", "show the computer screen on a large wall or screen"], ["headphones", "let one person listen to sound privately"], ["plotter", "print large drawings and plans"], ["touchscreen", "let us touch the screen to give commands"], ["digital camera", "capture photos that can be sent to the computer"], ["card reader", "read the data on a chip or magnetic card"]]
    });

    X("storage-memory", "Storage devices and memory", {
        i: "Memory holds data the computer is using. RAM is temporary and is cleared when the power goes off. ROM keeps startup instructions. Storage devices such as hard disks, flash drives and memory cards keep files permanently. Data size is measured in bytes, KB, MB, GB and TB.",
        r: "A song may be 4 MB. A phone with 64 GB can store thousands of songs and photos. Always back up your school work.",
        k: ["RAM: temporary; ROM: permanent startup.", "1 KB is about 1000 bytes; 1 MB is about 1000 KB.", "1 GB is about 1000 MB.", "Back up important files."],
        e: ["Which is bigger, 1 MB or 1 KB?", ["KB is the small unit.", "1 MB is 1000 KB."], "1 MB"],
        d: D.table("Units of data", ["Unit", "About"], [["1 byte", "8 bits"], ["1 KB", "1000 bytes"], ["1 MB", "1000 KB"], ["1 GB", "1000 MB"], ["1 TB", "1000 GB"]]),
        m: "Mixing up memory and storage. Memory is short term; storage keeps files.",
        more: [["Storage devices", "Hard disks hold a lot and sit inside the computer. Flash drives and memory cards are small and portable. Optical discs such as CDs and DVDs are read by laser."], ["Backing up", "A backup is a spare copy of your files kept on another device or in the cloud. If the computer fails or a virus attacks, you can restore your work."]],
        act: ["Check storage", ["Find the storage size of a computer or phone.", "Say how many GB are used and how many are free.", "List two files you should back up."]],
        sum: "RAM is temporary memory; storage devices keep files; data sizes grow from bytes to terabytes."
    }, {
        pairs: [["RAM", "the temporary memory a computer uses while it is working", 0], ["ROM", "memory that keeps the startup instructions and cannot be changed easily", 0], ["hard disk", "a storage device inside the computer that holds many files"], ["flash drive", "a small portable storage device that plugs into a USB port"], ["memory card", "a small card used to store photos and files in phones and cameras"], ["CD", "a plastic disc that stores data and is read by a laser"], ["cloud storage", "storing files on the internet instead of on your own device", 0], ["file", "a named collection of data saved on a computer"], ["folder", "a place that holds files and other folders"], ["kilobyte", "about one thousand bytes"], ["megabyte", "about one thousand kilobytes"], ["gigabyte", "about one thousand megabytes"], ["backup", "a spare copy of files kept in case the original is lost"], ["volatile memory", "memory that loses its contents when the power is switched off", 0], ["storage", "the keeping of data for later use", 0], ["capacity", "the amount of data a device can store", 0]]
    });

    X("hardware-software", "Hardware and software", {
        i: "Hardware is the physical parts of a computer that you can touch. Software is the programs that tell the hardware what to do. System software (operating system) runs the computer; application software does tasks like writing or drawing.",
        r: "The phone is hardware. Android and WhatsApp are software. A word processor is application software.",
        k: ["Hardware: monitor, keyboard, mouse, disk.", "Software: programs you cannot touch.", "Operating system manages the computer.", "Applications: word processor, browser, games."],
        e: ["Is a printer hardware or software?", ["Can you touch it?", "Yes, it is hardware."], "Hardware"],
        d: D.cards("Hardware and software", [["Hardware", "parts you can touch"], ["System software", "operating system, drivers"], ["Application software", "word processor, browser, games"]]),
        m: "Thinking software is a part you can hold. Software is a set of instructions.",
        more: [["Types of software", "System software controls the computer (Windows, Android). Utility software looks after it (antivirus). Application software lets us do tasks (Word, Chrome, games)."], ["Using software legally", "Pay for software or use free and open-source programs. Pirated software may carry viruses and is against the law."]],
        act: ["Sort the items", ["Write ten items from a computer lab.", "Mark each as hardware or software.", "Pick three applications you have used."]],
        sum: "Hardware is the machine; software is the programs that make it work."
    }, {
        cats: { "hardware": ["keyboard", "monitor", "mouse", "printer", "hard disk", "motherboard"], "software": ["Windows", "Microsoft Word", "Android", "Google Chrome", "an antivirus program", "a game app"] },
        pairs: [["hardware", "the physical parts of a computer that we can touch", 0], ["software", "the programs that tell a computer what to do", 0], ["system software", "software that runs and controls the computer", 0], ["application software", "software that helps users do a task such as writing or drawing", 0], ["operating system", "the main system software that manages the computer"], ["utility software", "software that looks after the computer, such as antivirus", 0], ["program", "a set of instructions that tells a computer what to do"], ["driver", "software that lets the computer use a device such as a printer"], ["app", "a program designed to do one job, usually on a phone"], ["open-source software", "software whose code anyone can see and change", 0], ["browser", "an application used to view web pages"], ["word processor", "an application for writing and editing documents"], ["antivirus", "software that finds and removes viruses"], ["freeware", "software that can be used for free", 0], ["software licence", "the permission to use a piece of software"], ["software update", "a new version of a program that fixes problems or adds features"]]
    });

    X("types-generations", "Types and generations of computers", {
        i: "Computers differ in size and power: supercomputers, mainframes, desktops, laptops, tablets, smartphones and embedded computers. Computers have also moved through generations: vacuum tubes, transistors, integrated circuits and microprocessors.",
        r: "A school lab may use desktops. Students carry laptops and tablets. A washing machine has an embedded computer. Weather centres use supercomputers.",
        k: ["Supercomputer: fastest; mainframe: large organisations.", "Microcomputers: desktop, laptop, tablet, phone.", "1st generation: vacuum tubes; 2nd: transistors.", "3rd: integrated circuits; 4th: microprocessors."],
        e: ["Which generation used transistors?", ["Vacuum tubes came first.", "Then transistors."], "The second generation"],
        d: D.table("Generations", ["Generation", "Main part"], [["1st (1940s)", "vacuum tubes"], ["2nd (1950s)", "transistors"], ["3rd (1960s)", "integrated circuits"], ["4th (1970s on)", "microprocessors"]]),
        m: "Thinking all computers look like a desktop. Phones, cars and ATMs contain computers too.",
        more: [["Sizes of computer", "Supercomputers do billions of calculations in a second. Mainframes serve banks and governments. Microcomputers serve individuals. Embedded computers run inside machines."], ["Becoming smaller and faster", "Each generation made computers smaller, cheaper, faster and more reliable than the one before."]],
        act: ["Computer survey", ["Count the computers you use in a week.", "Write the type of each one.", "Which is the most powerful?"]],
        sum: "Computers come in many types and have become smaller and faster through four generations."
    }, {
        pairs: [["supercomputer", "the fastest and most powerful type of computer"], ["mainframe", "a large powerful computer used by banks and governments"], ["desktop computer", "a computer that stays on a desk, with separate parts"], ["laptop", "a portable computer with a screen and keyboard in one case"], ["tablet", "a flat portable computer with a touchscreen"], ["smartphone", "a mobile phone that works as a small computer"], ["server", "a powerful computer that provides services to other computers"], ["embedded computer", "a tiny computer inside a machine such as a washing machine"], ["first generation computer", "an early computer from the 1940s that used vacuum tubes"], ["second generation computer", "a computer of the 1950s that used transistors"], ["third generation computer", "a computer of the 1960s that used integrated circuits"], ["fourth generation computer", "a computer from the 1970s onwards that uses microprocessors"], ["vacuum tube", "a glass tube used as a switch in the first computers"], ["transistor", "a small electronic switch that replaced the vacuum tube"], ["integrated circuit", "a tiny chip that holds many electronic parts"], ["microprocessor", "a single chip that does the work of a computer processor"]]
    });

    X("operating-system", "Operating system and desktop", {
        i: "The operating system (OS) manages the computer, runs programs and lets us use files. Windows, Android, iOS and Linux are operating systems. The desktop is the main screen with icons, a taskbar and a start menu.",
        r: "When you start a computer, the OS loads (booting). You click icons to open programs and use the recycle bin for deleted files.",
        k: ["Examples: Windows, Android, iOS, Linux.", "Icon: small picture for a program or file.", "Taskbar shows open programs.", "Recycle bin holds deleted files."],
        e: ["What do we call starting up a computer?", ["The computer loads the OS.", "Booting."], "Booting"],
        d: D.cards("The desktop", [["Icon", "picture for a program or file"], ["Taskbar", "bar at the bottom"], ["Start menu", "list of programs"], ["Window", "box that shows a program"]]),
        m: "Pulling the plug to turn off. Shut down through the Start menu to protect your files.",
        more: [["Files and folders", "A file is a saved piece of work. A folder holds files. File names have an extension such as .docx or .jpg that tells the kind of file."], ["Shutting down properly", "Close programs, save your work and choose Shut down from the menu. Switching off at the wall can damage files."]],
        act: ["Explore the desktop", ["Open a program from the Start menu.", "Create a folder with your name.", "Save a file inside it.", "Find the recycle bin."]],
        sum: "The operating system runs the computer; the desktop is where we start and manage our work."
    }, {
        pairs: [["operating system", "the main program that manages a computer and its programs"], ["desktop", "the main screen shown when a computer has started"], ["icon", "a small picture that stands for a program or file"], ["window", "a rectangular area of the screen that shows a program"], ["taskbar", "the bar at the bottom of the screen that shows open programs"], ["start menu", "a menu that lists programs and settings"], ["shortcut", "an icon that opens a program or file quickly"], ["wallpaper", "the picture used as the background of the desktop", 0], ["cursor", "the mark on the screen that shows where typing will appear"], ["menu", "a list of choices on the screen"], ["recycle bin", "a folder that holds deleted files until they are removed for good"], ["file extension", "the letters after the dot in a file name that show its type"], ["Windows", "an operating system made by Microsoft", 0], ["Android", "an operating system for phones made by Google", 0], ["iOS", "the operating system of the iPhone", 0], ["booting", "starting up a computer", 0]]
    });

    X("keyboard-mouse", "Keyboard and mouse skills", {
        i: "The keyboard has letter keys, number keys and special keys. Touch typing means typing without looking at the keys. The mouse points and clicks: click, double-click, right-click and drag and drop.",
        r: "Press Shift with a letter for a capital. Ctrl + C copies and Ctrl + V pastes. Rest your fingers on the home row: A S D F and J K L ;.",
        k: ["Enter: new line. Space bar: space.", "Shift: capitals. Backspace: delete left.", "Click selects; double-click opens; right-click opens a menu.", "Ctrl + C copy, Ctrl + V paste, Ctrl + Z undo."],
        e: ["Which key makes capital letters?", ["It is used with a letter key.", "The Shift key."], "Shift"],
        d: D.table("Useful shortcuts", ["Keys", "Action"], [["Ctrl + C", "copy"], ["Ctrl + V", "paste"], ["Ctrl + X", "cut"], ["Ctrl + Z", "undo"], ["Ctrl + S", "save"]]),
        m: "Pressing Caps Lock for one capital letter. Hold Shift instead.",
        more: [["Good typing habits", "Sit straight, keep your wrists level, rest your fingers on the home row and look at the screen. Practise a little each day to type faster."], ["Mouse skills", "Hold the mouse lightly. Use the left button to select and the right button for menus. The scroll wheel moves pages up and down."]],
        act: ["Typing practice", ["Type your full name and school address.", "Use Shift to make capitals.", "Use Backspace to correct mistakes.", "Save the file."]],
        sum: "Learn the special keys, mouse actions and shortcuts to work quickly and well."
    }, {
        sets: [
            { pairs: [["Enter key", "the key that starts a new line or confirms a command"], ["Space bar", "the long key that makes a space between words"], ["Shift key", "the key used to type capital letters and symbols"], ["Caps Lock key", "the key that keeps all letters capital until pressed again"], ["Backspace key", "the key that deletes the character before the cursor"], ["Delete key", "the key that deletes the character after the cursor"], ["Tab key", "the key that moves the cursor a few spaces across"], ["Escape key", "the key that cancels a command"], ["home row", "the middle row of letter keys where the fingers rest", 0], ["touch typing", "typing without looking at the keys", 0], ["click", "to press and release the left mouse button", 0], ["double-click", "to press the left button twice quickly", 0], ["right-click", "to press the right mouse button to open a menu", 0], ["drag and drop", "to move an item by holding the mouse button and releasing it", 0], ["scroll wheel", "the wheel on a mouse used to move a page up or down"], ["pointer", "the arrow on the screen that moves with the mouse"]] },
            { pairs: [["Ctrl + C", "the shortcut that copies the selected item", 0], ["Ctrl + V", "the shortcut that pastes the copied item", 0], ["Ctrl + X", "the shortcut that cuts the selected item", 0], ["Ctrl + Z", "the shortcut that undoes the last action", 0], ["Ctrl + S", "the shortcut that saves a file", 0], ["Ctrl + P", "the shortcut that prints a document", 0], ["Ctrl + A", "the shortcut that selects everything", 0], ["Ctrl + B", "the shortcut that makes selected text bold", 0]] }
        ]
    });

    X("word-processing", "Word processing", {
        i: "A word processor is an application for writing, editing, formatting and printing documents. Microsoft Word and Google Docs are examples. We can change font, size, colour, alignment, add bullets, tables and pictures, check spelling and save.",
        r: "A teacher types a letter in Word, makes the heading bold, centres it and prints copies for parents.",
        k: ["Bold, italic, underline.", "Alignment: left, centre, right, justify.", "Cut, copy, paste and undo.", "Save often and use spell check."],
        e: ["Which tool finds spelling mistakes?", ["Words with wavy red lines.", "Spell check."], "Spell check"],
        d: D.cards("Word processing tools", [["Format", "font, size, bold, italic, underline"], ["Layout", "margins, alignment, line spacing"], ["Edit", "cut, copy, paste, undo"], ["Insert", "pictures, tables, page numbers"]]),
        m: "Using the space bar to centre a title. Use the centre alignment button.",
        more: [["Saving a document", "Choose Save, give the file a clear name and pick a folder. Use Save As to make a copy with a new name. Press Ctrl + S often to avoid losing work."], ["Printing", "Check the preview, choose the printer and number of copies and press Print. Use Print Preview to avoid wasting paper."]],
        act: ["Write a notice", ["Type a notice about a school event.", "Make the heading bold, centred and larger.", "Use bullets for the details.", "Run the spell check and save."]],
        sum: "A word processor helps us write, format and print neat documents."
    }, {
        pairs: [["document", "a piece of work created and saved on a computer"], ["font", "the style of the letters used in a document"], ["font size", "how big the letters are, measured in points"], ["bold", "thick dark letters used for emphasis", 0], ["italic", "slanted letters used for titles and emphasis", 0], ["underline", "a line drawn under text", 0], ["alignment", "the way text lines up with the margins", 0], ["margin", "the empty space between the text and the edge of the page"], ["paragraph", "a block of text that deals with one idea"], ["spell check", "a tool that finds spelling mistakes"], ["header", "text at the top of every page"], ["footer", "text at the bottom of every page"], ["cut", "to remove the selected text and keep it ready to paste", 0], ["copy", "to make a duplicate of the selected text", 0], ["paste", "to place cut or copied text into the document", 0], ["undo", "a command that cancels the last action", 0]]
    });

    X("spreadsheets", "Spreadsheets", {
        i: "A spreadsheet is an application for working with numbers in a grid of rows and columns. Each box is a cell with an address such as B3. Formulas begin with = and calculate automatically. Examples: Microsoft Excel and Google Sheets.",
        r: "A teacher records marks in a spreadsheet and uses =SUM(B2:B6) to total them and =AVERAGE(B2:B6) for the mean.",
        k: ["Cell address: column letter then row number.", "Formula starts with =.", "SUM adds; AVERAGE finds the mean; MAX and MIN find largest and smallest.", "Charts show data as pictures."],
        e: ["Cells A1 to A3 hold 4, 6 and 8. What does =SUM(A1:A3) give?", ["Add the three numbers.", "4 + 6 + 8 = 18."], "18"],
        d: D3.grid(),
        m: "Typing the answer instead of a formula. A formula updates when the numbers change.",
        more: [["Rows, columns and cells", "Columns run up and down and are named A, B, C. Rows run across and are numbered 1, 2, 3. A cell is where a column and a row meet."], ["Charts", "A bar chart compares amounts, a line chart shows change over time and a pie chart shows parts of a whole."]],
        act: ["Class marks", ["Enter names and marks for five pupils.", "Use =SUM and =AVERAGE for the marks.", "Make a bar chart of the marks."]],
        sum: "Spreadsheets store numbers in cells and use formulas to calculate quickly and accurately."
    }, {
        gens: [function (r) { var n = ri(r, 3, 5), v = [], t = 0; for (var i = 0; i < n; i++) { var x = ri(r, 2, 40); v.push(x); t += x; } return numQ(r, 'Cells A1 to A' + n + ' hold ' + v.join(', ') + '. What does =SUM(A1:A' + n + ') give?', t, [t + 10, t - 5, t * 2], '', 'SUM adds all the numbers: ' + v.join(' + ') + ' = ' + t + '.', 'sum' + v.join('_')); }, function (r) { var n = ri(r, 3, 5), k = ri(r, 3, 15), v = [], t = 0; for (var i = 0; i < n; i++) { var x = k * ri(r, 1, 8); v.push(x); t += x; } var a = t / n; if (a !== Math.floor(a)) { v[0] += n - (t % n); t = v.reduce(function (p, c) { return p + c; }, 0); a = t / n; } return numQ(r, 'Cells B1 to B' + n + ' hold ' + v.join(', ') + '. What does =AVERAGE(B1:B' + n + ') give?', a, [t, a + 5, Math.max.apply(null, v)], '', 'AVERAGE = sum / count = ' + t + ' / ' + n + ' = ' + a + '.', 'avg' + v.join('_')); }, function (r) { var v = []; for (var i = 0; i < 4; i++) v.push(ri(r, 5, 99)); var mx = Math.max.apply(null, v); return numQ(r, 'Cells C1 to C4 hold ' + v.join(', ') + '. What does =MAX(C1:C4) give?', mx, [Math.min.apply(null, v), v.reduce(function (p, c) { return p + c; }, 0), mx - 1], '', 'MAX gives the largest number, ' + mx + '.', 'max' + v.join('_')); }, function (r) { var v = []; for (var i = 0; i < 4; i++) v.push(ri(r, 5, 99)); var mn = Math.min.apply(null, v); return numQ(r, 'Cells D1 to D4 hold ' + v.join(', ') + '. What does =MIN(D1:D4) give?', mn, [Math.max.apply(null, v), v.reduce(function (p, c) { return p + c; }, 0), mn + 1], '', 'MIN gives the smallest number, ' + mn + '.', 'min' + v.join('_')); }],
        pairs: [["spreadsheet", "an application for working with numbers in rows and columns"], ["cell", "a box where a row and a column meet"], ["row", "a horizontal line of cells numbered 1, 2, 3"], ["column", "a vertical line of cells named A, B, C"], ["cell address", "the column letter and row number that name a cell, such as B3"], ["worksheet", "a single page of cells in a spreadsheet"], ["workbook", "a spreadsheet file that can hold many worksheets"], ["formula", "an instruction that calculates a value in a cell"], ["function", "a ready-made formula such as SUM"], ["SUM", "a function that adds numbers", 0], ["AVERAGE", "a function that finds the mean of numbers", 0], ["MAX", "a function that finds the largest number", 0], ["MIN", "a function that finds the smallest number", 0], ["chart", "a picture that shows data"], ["range", "a group of cells such as A1 to A5"], ["sorting", "arranging data in order", 0]]
    });

    X("presentations", "Presentations", {
        i: "A presentation program (PowerPoint, Google Slides) makes slides to show ideas to an audience. Each slide has text, pictures and sometimes sound or video. Good slides have short points, clear fonts and strong contrast.",
        r: "A pupil makes a five-slide talk on malaria with a title slide, causes, symptoms, prevention and a summary.",
        k: ["Slide: one page of a presentation.", "Use short bullet points.", "Transitions and animations add movement.", "Practise before you present."],
        e: ["What is the first slide called?", ["It shows the title and name.", "Title slide."], "Title slide"],
        d: D.flow("Making a presentation", ["Plan the topic and key points", "Choose a template and layout", "Add text, pictures and notes", "Rehearse and present"]),
        m: "Putting too much text on a slide. Use short points and speak the rest.",
        more: [["Design tips", "Use large letters, high contrast colours (dark on light), one idea per slide and clear pictures. Do not use too many animations."], ["Giving the talk", "Face the audience, speak clearly and slowly, do not read every word and keep to the time. Use speaker notes to remember details."]],
        act: ["Three-slide talk", ["Choose a topic you know well.", "Make a title slide and two content slides.", "Add one picture.", "Present to a partner."]],
        sum: "A good presentation has clear slides and a confident speaker."
    }, {
        pairs: [["presentation", "a talk supported by slides"], ["slide", "one page of a presentation"], ["slide show", "the display of slides one after another", 0], ["layout", "the way text and pictures are arranged on a slide"], ["transition", "the effect used when changing from one slide to the next"], ["animation", "movement given to text or pictures on a slide", 0], ["template", "a ready-made design for slides"], ["theme", "a set of colours and fonts used for all slides"], ["bullet point", "a short line of text marked with a dot"], ["speaker notes", "notes for the presenter that the audience cannot see", 0], ["title slide", "the first slide that shows the title and the presenter"], ["handout", "a printed copy of slides for the audience"], ["rehearse", "to practise a presentation before giving it", 0], ["audience", "the people who watch and listen to a presentation"], ["PowerPoint", "a popular presentation program from Microsoft", 0], ["Google Slides", "a free online presentation program from Google", 0]]
    });

    X("internet-email", "Internet and email", {
        i: "The internet is a worldwide network of connected computers. The World Wide Web is the collection of web pages we view with a browser. A search engine finds information. Email sends messages electronically to an address such as name@example.com.",
        r: "You search for facts on Google, read a school website and send an email to a friend with a picture attached.",
        k: ["Browser: Chrome, Firefox, Safari.", "URL: address of a web page.", "Email: to, subject, message, attachment.", "Download: copy to your device; upload: send to the internet."],
        e: ["What does the @ symbol do in an email address?", ["It separates two parts.", "User name and domain."], "It separates the user name from the domain"],
        d: D.flow("Sending an email", ["Open your email account", "Click New message", "Type the address, subject and message", "Attach a file if needed", "Click Send"]),
        m: "Believing everything on the internet. Check facts from trusted sources.",
        more: [["Searching well", "Use clear keywords, check several websites and prefer trusted sources such as schools, government and respected news sites."], ["Email manners", "Write a clear subject line, greet the person, keep the message short and polite and check the address before sending."]],
        act: ["Search and send", ["Use a search engine to find three facts about Nigeria.", "Write an email to your teacher with the facts.", "Add a subject and a polite greeting."]],
        sum: "The internet connects the world; we browse, search and email carefully and politely."
    }, {
        pairs: [["internet", "a worldwide network of connected computers", 0], ["World Wide Web", "the collection of web pages that we view on the internet", 0], ["website", "a group of linked web pages"], ["web page", "a single document on the web"], ["browser", "a program used to view web pages"], ["search engine", "a website that finds information on the internet"], ["URL", "the address of a web page", 0], ["hyperlink", "a link that takes you to another page"], ["download", "to copy a file from the internet to your device", 0], ["upload", "to send a file from your device to the internet", 0], ["email", "a message sent electronically", 0], ["inbox", "the folder where received emails appear"], ["attachment", "a file sent along with an email"], ["subject line", "the short title of an email"], ["Wi-Fi", "a way of connecting to the internet without wires", 0], ["router", "a device that shares an internet connection with other devices"]]
    });

    X("internet-safety", "Internet safety and computer ethics", {
        i: "Using the internet safely means protecting personal information, using strong passwords, being kind online and avoiding unsafe sites. Ethics are rules about right and wrong, such as not copying others' work (plagiarism) and respecting copyright.",
        r: "A stranger asks for your address in a chat: do not give it. A message says you won a prize if you click a link: it is likely a scam (phishing).",
        k: ["Never share passwords or personal details.", "Tell a trusted adult about bad messages.", "Do not plagiarise; respect copyright.", "Think before you post."],
        e: ["What is a strong password?", ["It must be hard to guess.", "A long mix of letters, numbers and symbols."], "A long mix of letters, numbers and symbols"],
        d: D.cards("Stay safe online", [["Private", "keep your password and address secret"], ["Careful", "do not click unknown links"], ["Kind", "no cyberbullying"], ["Honest", "give credit; do not copy"]]),
        m: "Thinking that anything posted can be deleted completely. A digital footprint can stay for years.",
        more: [["Dangers online", "Cyberbullying, scams, phishing, strangers pretending to be friends, viruses and fake news are dangers. Report them to a trusted adult or the platform."], ["Good digital citizens", "They are polite, check facts, ask permission before posting photos of others, give credit to authors and limit screen time."]],
        act: ["Make a password rule list", ["Write five rules for a strong password.", "Test a sample password against your rules.", "Explain why you should not reuse it."]],
        sum: "Be safe, kind and honest online."
    }, {
        cats: { "safe online behaviour": ["using a strong password", "keeping personal information private", "telling a trusted adult about bad messages", "logging out on shared computers", "asking permission before downloading", "checking facts before sharing"], "unsafe online behaviour": ["sharing your password", "meeting an online stranger alone", "clicking unknown links", "posting your home address", "using the same password everywhere", "opening attachments from strangers"] },
        pairs: [["cyberbullying", "using the internet to hurt, frighten or embarrass someone", 0], ["phishing", "a trick to steal passwords or money by pretending to be a trusted person", 0], ["password", "a secret word or code that protects an account"], ["strong password", "a long mix of letters, numbers and symbols that is hard to guess"], ["privacy", "the right to keep personal information to yourself", 0], ["scam", "a trick used to cheat people of money"], ["plagiarism", "copying someone else's work and saying it is yours", 0], ["copyright", "the legal right of the owner of a work to control its copying", 0], ["netiquette", "polite and respectful behaviour online", 0], ["digital footprint", "the trail of data you leave when you use the internet"], ["ethics", "rules about right and wrong behaviour", 0], ["firewall", "a barrier that blocks unsafe traffic from a network"], ["two-step verification", "a second check, such as a code, used to confirm who you are", 0], ["fake news", "false information shared as if it were true", 0], ["screen time", "the time spent using screens", 0], ["personal information", "details such as your name, address and phone number", 0]]
    });

    X("viruses-care", "Computer viruses and care of computers", {
        i: "A computer virus is a harmful program that copies itself and damages files. Malware includes viruses, worms, trojans and spyware. Antivirus software, updates, backups and careful use protect a computer. Care also means keeping it clean, cool and powered safely.",
        r: "A virus may enter from an infected flash drive or an email attachment. Keep an antivirus running, scan flash drives and use a surge protector or UPS during power cuts.",
        k: ["Install and update antivirus software.", "Do not open unknown attachments.", "Back up files.", "Shut down properly and keep the computer clean."],
        e: ["Name one way to protect a computer from viruses.", ["Think of software that finds viruses.", "Install and update antivirus."], "Install and update antivirus software"],
        d: D.cards("Care of a computer", [["Software", "antivirus, updates, backups"], ["Habits", "no unknown links or pirated software"], ["Hardware", "keep dry, cool, dust-free"], ["Power", "surge protector or UPS"]]),
        m: "Thinking antivirus never needs updating. New viruses appear every day.",
        more: [["Kinds of malware", "A worm spreads by itself through networks. A trojan pretends to be useful but harms the computer. Spyware secretly watches what you do."], ["Power care", "Sudden power cuts and surges can damage the computer. A UPS has a battery that keeps the computer on for a few minutes so you can save and shut down."]],
        act: ["Computer care checklist", ["List five habits that protect a computer.", "Tick those you already do.", "Plan how to improve the rest."]],
        sum: "Protect your computer with antivirus, updates, backups, safe habits and clean power."
    }, {
        pairs: [["computer virus", "a harmful program that copies itself and damages files"], ["malware", "any harmful software made to damage or spy on a computer", 0], ["worm", "a harmful program that spreads by itself through networks"], ["trojan horse", "a program that pretends to be useful but harms the computer"], ["spyware", "software that secretly watches what you do", 0], ["antivirus", "software that finds and removes viruses", 0], ["firewall", "a barrier that blocks unsafe traffic from a network"], ["backup", "a spare copy of files kept in case the original is lost"], ["software update", "a new version of a program that fixes problems"], ["scan", "to check files for viruses"], ["quarantine", "a safe place where antivirus keeps suspicious files"], ["UPS", "a device with a battery that keeps a computer running during a power cut", 0], ["shut down", "to turn off a computer properly through the operating system", 0], ["pirated software", "software copied and used without permission", 0], ["surge protector", "a device that protects equipment from sudden rises in voltage"], ["data loss", "the loss of files because of damage, deletion or a virus", 0]]
    });

    X("networks-telecom", "Networks and telecommunications", {
        i: "A network is a group of computers and devices linked so they can share files, printers and the internet. A LAN covers a small area like a school; a WAN covers a large area. Telecommunication is sending information over distance, for example by phone, radio and the internet.",
        r: "School computers on a LAN share a printer. Your phone connects to a mobile network using a SIM card. A fibre optic cable carries internet as pulses of light.",
        k: ["LAN: small area; WAN: large area.", "Router, modem and server link networks.", "Wi-Fi and Bluetooth work without wires.", "Fibre optic cables carry data as light."],
        e: ["Is a school computer lab network a LAN or a WAN?", ["It is in one building.", "A small area: LAN."], "LAN"],
        d: D3.network(),
        m: "Thinking Wi-Fi is the internet. Wi-Fi only connects a device to a router.",
        more: [["Ways to communicate", "Sound and signs, drums, letters, telephones, radio, television, mobile phones and the internet are communication methods. Modern telecommunication is fast and covers the world."], ["Mobile networks", "A phone sends signals to a nearby mast. The mast passes calls and data along cables or radio links to reach another phone or a website."]],
        act: ["Draw a school network", ["Draw five computers, a printer and a router.", "Join them with lines.", "Say what each device can share."]],
        sum: "Networks link devices so they can share information, and telecommunication carries it across distance."
    }, {
        pairs: [["network", "a group of computers and devices linked together to share information"], ["LAN", "a network covering a small area such as a school", 0], ["WAN", "a network covering a large area, such as the internet", 0], ["server", "a powerful computer that serves other computers on a network"], ["router", "a device that sends data between networks"], ["modem", "a device that connects a network to the internet over a telephone or cable line"], ["Wi-Fi", "a way of connecting devices to a network without wires", 0], ["Bluetooth", "a short-range wireless link between devices", 0], ["telecommunication", "sending information over a distance by electronic means", 0], ["SIM card", "a small card that identifies a phone on a mobile network"], ["fibre optic cable", "a cable that sends data as pulses of light"], ["bandwidth", "the amount of data that can be sent in a given time", 0], ["node", "a device connected to a network"], ["mobile mast", "a tall tower that sends and receives phone signals"], ["broadband", "a fast internet connection", 0], ["satellite link", "a connection that sends signals through a satellite in space"]]
    });

    X("algorithms-coding", "Algorithms and coding basics", {
        i: "An algorithm is a set of step-by-step instructions for solving a problem. A program is an algorithm written in a programming language such as Scratch or Python. Flowcharts show algorithms with symbols. Programs use sequence, selection (if) and loops (repeat).",
        r: "A recipe is an algorithm. A game that says if the player touches a wall then lose a life uses selection. A loop repeats an action like drawing a square four times.",
        k: ["Algorithm: clear steps in order.", "Sequence, selection, loop.", "A bug is a mistake; debugging fixes it.", "Flowchart symbols: oval, box, diamond."],
        e: ["Start at 0. Add 5. Then multiply by 2. What is the result?", ["0 + 5 = 5.", "5 x 2 = 10."], "10"],
        d: D3.flowchart(),
        m: "Skipping steps in an algorithm. A computer does exactly what the steps say.",
        more: [["Block coding", "Scratch lets you snap blocks together to move characters, make sounds and build games. It is a friendly way to learn coding."], ["Debugging", "If a program does not work, check each step in order, test small parts and fix the bug. Even expert programmers debug every day."]],
        act: ["Write an algorithm", ["Write the steps for making a cup of tea.", "Number each step.", "Swap with a partner and test it exactly as written."]],
        sum: "Algorithms and programs tell computers exactly what to do, step by step."
    }, {
        gens: [function (r) { var a = ri(r, 1, 20), b = ri(r, 2, 15), c = ri(r, 2, 6); return numQ(r, 'An algorithm says: start with x = ' + a + '; add ' + b + '; then multiply by ' + c + '. What is the final value of x?', (a + b) * c, [a + b * c, a * b * c, a + b + c], '', '(' + a + ' + ' + b + ') x ' + c + ' = ' + ((a + b) * c) + '.', 'alg' + a + ':' + b + ':' + c); }, function (r) { var n = ri(r, 2, 12), k = ri(r, 2, 9); return numQ(r, 'A loop starts with total = 0 and adds ' + k + ' each time. The loop repeats ' + n + ' times. What is total at the end?', n * k, [n + k, n * k + k, n * k - n], '', 'Total = ' + k + ' x ' + n + ' = ' + (n * k) + '.', 'loop' + n + ':' + k); }, function (r) { var s = ri(r, 3, 12), t = ri(r, 5, 30); return numQ(r, 'In a program, score = ' + s + '. If score is less than ' + t + ', add 10. What is score after the program runs?', s < t ? s + 10 : s, [s, s + 20, s - 10 > 0 ? s - 10 : s + 5], '', s < t ? 'The condition is true, so ' + s + ' + 10 = ' + (s + 10) + '.' : 'The condition is false, so score stays ' + s + '.', 'sel' + s + ':' + t); }],
        pairs: [["algorithm", "a set of step-by-step instructions for solving a problem"], ["programming language", "a set of words and rules used to write programs"], ["code", "the instructions of a program written in a programming language", 0], ["bug", "a mistake in a program"], ["debugging", "finding and fixing mistakes in a program", 0], ["flowchart", "a diagram that shows the steps of an algorithm"], ["sequence", "instructions carried out one after another", 0], ["selection", "a choice made in a program using if and else", 0], ["loop", "a set of instructions that repeats many times"], ["variable", "a named place that stores a value"], ["Scratch", "a block-based language for learning to code", 0], ["Python", "a popular programming language", 0], ["pseudocode", "an outline of a program written in plain English", 0], ["oval symbol", "the flowchart shape that shows the start or the end", 0], ["diamond symbol", "the flowchart shape that shows a yes or no question", 0], ["rectangle symbol", "the flowchart box that shows a step or instruction", 0]]
    });
})(typeof window !== 'undefined' ? window : globalThis);

(function (root) {
    if (!root.CMLearnBst) return;
    var h = root.CMLearnBst.h, X = h.X, S = h.S, D = h.D, D3 = h.D3;
    S("Health, Safety and Physical Education");

    X("personal-hygiene", "Personal hygiene", {
        i: "Personal hygiene means keeping the body clean to stay healthy and prevent disease. It includes bathing, washing hands, brushing teeth, caring for hair and nails, and wearing clean clothes.",
        r: "Wash your hands with soap before eating and after using the toilet. Cut your nails short. Brush your teeth morning and night.",
        k: ["Bath daily with soap and clean water.", "Wash hands before meals and after the toilet.", "Brush teeth twice a day.", "Wear clean clothes and keep nails short."],
        e: ["When should we wash our hands?", ["Germs are on hands after using the toilet.", "Germs can enter food if hands are dirty."], "Before eating and after using the toilet"],
        d: D.cards("Daily hygiene", [["Skin", "bath with soap daily"], ["Hands", "wash before meals and after the toilet"], ["Teeth", "brush twice a day"], ["Hair and nails", "keep clean and short"]]),
        m: "Washing hands with water only. Soap is needed to remove germs.",
        more: [["How to wash hands well", "Wet your hands, rub them with soap for at least 20 seconds, scrub palms, backs, between fingers and under nails, rinse and dry with a clean cloth."], ["Hygiene problems", "Poor hygiene can cause body odour, skin infections such as ringworm, lice in the hair and diseases like diarrhoea."]],
        act: ["Hand-washing demonstration", ["Rub a little powder or flour on your hands.", "Wash with water only and see what is left.", "Wash again with soap and compare."]],
        sum: "Clean habits keep germs away and protect health."
    }, {
        cats: { "good hygiene habit": ["bathing daily", "washing hands with soap", "brushing teeth twice a day", "keeping nails short", "wearing clean clothes", "covering the mouth when sneezing"], "poor hygiene habit": ["sharing a towel", "biting dirty nails", "eating with unwashed hands", "wearing dirty clothes", "using a shared comb on someone with lice", "spitting on the ground"] },
        pairs: [["hygiene", "the practice of keeping the body and surroundings clean", 0], ["germ", "a tiny living thing that can cause disease"], ["handwashing", "cleaning the hands with soap and water", 0], ["soap", "a cleaning substance used with water", 0], ["bathing", "washing the whole body with soap and water", 0], ["oral hygiene", "keeping the mouth and teeth clean", 0], ["nail care", "keeping the nails clean and short", 0], ["hand sanitiser", "a liquid that kills germs on the hands"], ["deodorant", "a product that reduces body odour"], ["lice", "tiny insects that live in the hair and bite the scalp", 0], ["ringworm", "a skin infection caused by a fungus", 0], ["body odour", "the bad smell caused by sweat and bacteria", 0], ["foot care", "keeping the feet clean and dry", 0], ["sneezing etiquette", "covering the nose and mouth when sneezing or coughing", 0], ["toothbrush", "a small brush used to clean the teeth"], ["towel", "a cloth used to dry the body after washing"]]
    });

    X("environmental-sanitation", "Environmental sanitation", {
        i: "Environmental sanitation means keeping our surroundings clean: proper refuse disposal, clean drains, safe toilets and control of pests. It prevents diseases like cholera, typhoid and malaria.",
        r: "In many communities people clear drains, sweep compounds and bury or burn refuse safely. A sanitary inspector checks markets and eateries.",
        k: ["Dispose of refuse in dustbins.", "Keep drains free of stagnant water.", "Use a clean toilet; do not defecate in the open.", "Control rats, flies and mosquitoes."],
        e: ["Why should stagnant water be cleared?", ["Mosquitoes breed in it.", "They spread malaria."], "Mosquitoes breed in it"],
        d: D.cards("Clean surroundings", [["Refuse", "bins, collection, recycling"], ["Water", "clean sources, clear gutters"], ["Toilets", "clean, covered, washed daily"], ["Pests", "control flies, rats, mosquitoes"]]),
        m: "Burning all refuse. Smoke pollutes the air; sort, recycle and dispose properly.",
        more: [["Waste and disease", "Heaps of refuse attract flies and rats that carry germs. Blocked gutters cause floods and breed mosquitoes."], ["Community action", "Communities hold sanitation days, build drains, provide refuse bins and pay refuse collectors. Everyone must help to keep the environment clean."]],
        act: ["Clean-up plan", ["Look around your school for dirty places.", "List three problems.", "Write one action to fix each.", "Choose a team to do it."]],
        sum: "A clean environment prevents disease and makes life pleasant."
    }, {
        pairs: [["sanitation", "the practice of keeping the environment clean and healthy", 0], ["drainage", "a system of channels that carries away waste water", 0], ["sewage", "waste water and waste from toilets and drains", 0], ["latrine", "a simple toilet, often a pit in the ground"], ["water closet", "a toilet that is flushed with water"], ["septic tank", "an underground tank that holds waste from toilets"], ["soak-away", "a pit that lets waste water seep into the ground"], ["gutter", "a channel at the side of a road or roof that carries water"], ["fumigation", "the use of smoke or chemicals to kill pests", 0], ["pest", "an animal that harms people, crops or stored food"], ["rodent", "an animal such as a rat that gnaws things"], ["open defecation", "passing waste in the open instead of a toilet", 0], ["stagnant water", "water that does not flow and where mosquitoes breed", 0], ["refuse collector", "a worker who collects and carries away rubbish"], ["sanitary inspector", "an official who checks cleanliness and health standards"], ["dustbin", "a container for keeping rubbish before it is collected"]]
    });

    X("food-classes", "Food classes", {
        i: "Food gives us energy, helps us grow and protects us from disease. The six classes of food are carbohydrates, proteins, fats and oils, vitamins, minerals and water. Roughage (fibre) helps digestion.",
        r: "Yam, rice and garri give energy. Beans, fish and eggs build the body. Oranges and vegetables protect against disease.",
        k: ["Carbohydrates: energy (yam, rice, bread).", "Proteins: growth and repair (beans, fish, eggs).", "Fats and oils: energy and warmth (palm oil).", "Vitamins and minerals: protection and health."],
        e: ["Which food class builds the body?", ["It helps to grow and repair.", "Proteins."], "Proteins"],
        d: D.table("Food classes", ["Class", "Examples", "Job"], [["Carbohydrate", "yam, rice", "energy"], ["Protein", "beans, fish", "growth"], ["Fats and oils", "palm oil", "warmth, energy"], ["Vitamins", "oranges, carrots", "protection"], ["Minerals", "salt, milk", "bones, blood"]]),
        m: "Thinking only meat has protein. Beans, groundnuts and soybeans have protein too.",
        more: [["Important minerals and vitamins", "Calcium makes bones and teeth strong. Iron makes blood. Iodine prevents goitre. Vitamin A helps the eyes, vitamin C protects against scurvy and vitamin D helps bones."], ["Water and roughage", "Water makes up about two thirds of the body and helps digestion and removal of waste. Roughage from vegetables and whole grains prevents constipation."]],
        act: ["Food classification", ["Write a list of what you ate yesterday.", "Group each food into a class.", "Which class was missing?"]],
        sum: "We need all six classes of food, plus roughage, to stay healthy."
    }, {
        cats: { "carbohydrate food": ["yam", "rice", "cassava", "bread", "maize", "plantain", "potato", "garri"], "protein food": ["beans", "fish", "egg", "meat", "groundnut", "soybean"], "fat and oil food": ["palm oil", "groundnut oil", "butter", "margarine", "coconut oil"], "food rich in vitamins": ["orange", "carrot", "spinach", "pawpaw", "mango", "tomato"] },
        pairs: [["nutrient", "a substance in food that the body needs"], ["carbohydrate", "a food class that gives energy"], ["protein", "a food class for growth and repair of the body"], ["fat", "a food class that gives a lot of energy and keeps the body warm"], ["vitamin", "a food class needed in small amounts to protect the body"], ["mineral", "a food class such as calcium or iron that the body needs in small amounts"], ["water", "the food class that makes up about two thirds of the body", 0], ["roughage", "the part of plant food that helps food move through the gut", 0], ["vitamin C", "the vitamin in citrus fruits that prevents scurvy", 0], ["vitamin A", "the vitamin that helps the eyes see in dim light", 0], ["calcium", "the mineral that makes bones and teeth strong", 0], ["iron", "the mineral needed to make red blood cells", 0], ["iodine", "the mineral needed to prevent goitre", 0], ["energy-giving food", "food that supplies energy, such as yam and rice"], ["body-building food", "food that helps the body to grow and repair, such as beans and fish"], ["protective food", "food rich in vitamins and minerals that helps the body resist disease"]]
    });

    X("balanced-diet", "Balanced diet", {
        i: "A balanced diet contains all the food classes in the right amounts for a person's age and activity. It keeps the body healthy and growing. Food should be fresh, clean, well cooked and properly stored.",
        r: "A balanced meal could be rice (energy), beans (protein), vegetable stew with fish (vitamins and protein) and an orange (vitamin C), with water to drink.",
        k: ["Eat the right amounts of each class.", "Eat fruits and vegetables daily.", "Avoid too much sugar, salt and fried food.", "Preserve food by drying, smoking, salting or refrigerating."],
        e: ["Is a meal of only rice a balanced diet?", ["Rice mostly gives carbohydrate.", "Other classes are missing."], "No"],
        d: D3.plate(),
        m: "Thinking more food means better health. A balanced diet is about the right kinds and amounts.",
        more: [["Planning a meal", "Choose one energy food, one body-building food and one protective food for each meal. Drink water, and eat three meals and small healthy snacks."], ["Food safety", "Wash hands and food before cooking, cook thoroughly, cover food, keep it away from flies, and check the expiry date on packaged food."]],
        act: ["Plan a balanced menu", ["Plan breakfast, lunch and supper for one day.", "Name the food classes in each.", "Add fruit and water."]],
        sum: "A balanced diet gives the body everything it needs, in the right amounts, from safe food."
    }, {
        cats: { "method of preserving food": ["drying", "smoking", "salting", "refrigeration", "canning", "freezing"], "sign of spoiled food": ["bad smell", "mould", "change of colour", "sliminess", "a swollen can", "a sour taste"] },
        pairs: [["balanced diet", "a diet that contains all the food classes in the right amounts"], ["diet", "the food and drink that a person usually eats"], ["meal", "food eaten at one time, such as lunch"], ["portion", "the amount of food served to one person"], ["snack", "a small amount of food eaten between meals"], ["junk food", "food with a lot of sugar, salt or fat and few nutrients", 0], ["food label", "information printed on a food package about what is inside"], ["expiry date", "the date after which food should not be eaten"], ["food preservation", "treating food so that it does not spoil", 0], ["refrigeration", "keeping food cold to slow down spoiling", 0], ["breakfast", "the first meal of the day", 0], ["dietitian", "a person trained to advise on food and health"], ["appetite", "the desire to eat", 0], ["fresh food", "food that has not been preserved or processed", 0], ["food hygiene", "keeping food clean and safe to eat", 0], ["processed food", "food that has been changed in a factory before sale", 0]]
    });

    X("malnutrition", "Malnutrition and deficiency diseases", {
        i: "Malnutrition is poor nutrition caused by too little or too much food or the wrong kinds of food. Deficiency diseases are caused by lack of a nutrient: kwashiorkor (protein), scurvy (vitamin C), rickets (vitamin D), goitre (iodine), anaemia (iron) and night blindness (vitamin A).",
        r: "A child with a swollen belly and thin limbs may have kwashiorkor. Goitre causes swelling of the neck. Eating iodised salt prevents goitre.",
        k: ["Kwashiorkor: lack of protein.", "Scurvy: lack of vitamin C.", "Rickets: lack of vitamin D.", "Obesity: eating too much for the body's needs."],
        e: ["Which disease is caused by lack of vitamin C?", ["It affects the gums.", "Scurvy."], "Scurvy"],
        d: D.table("Deficiency diseases", ["Disease", "Missing nutrient"], [["Kwashiorkor", "protein"], ["Scurvy", "vitamin C"], ["Rickets", "vitamin D"], ["Goitre", "iodine"], ["Anaemia", "iron"], ["Night blindness", "vitamin A"]]),
        m: "Thinking malnutrition means only hunger. Eating too much or the wrong kinds of food is also malnutrition.",
        more: [["Preventing malnutrition", "Eat a balanced diet, breastfeed babies, add iodised salt, eat fruits and vegetables and see a health worker if a child looks unwell."], ["Under and over nutrition", "Undernutrition leaves a person thin and weak. Overnutrition leads to obesity, which can cause diabetes and heart disease."]],
        act: ["Match disease and food", ["Write each deficiency disease.", "Name two foods that prevent it.", "Share with a partner."]],
        sum: "A balanced diet prevents malnutrition and deficiency diseases."
    }, {
        sets: [
            { style: "fact", ctx: "disease or condition", pairs: [["kwashiorkor", "is caused by a lack of protein"], ["scurvy", "is caused by a lack of vitamin C"], ["rickets", "is caused by a lack of vitamin D"], ["goitre", "is caused by a lack of iodine"], ["night blindness", "is caused by a lack of vitamin A"], ["anaemia", "is caused by a lack of iron"], ["marasmus", "is caused by a lack of food of all kinds"], ["obesity", "is caused by eating more energy than the body uses"]] },
            { pairs: [["malnutrition", "poor nutrition caused by too little, too much or the wrong kinds of food", 0], ["undernutrition", "not getting enough food or nutrients", 0], ["overnutrition", "eating too much food or too many calories", 0], ["kwashiorkor", "a disease of children with a swollen belly caused by too little protein", 0], ["marasmus", "a disease with a very thin body caused by too little food", 0], ["obesity", "being very overweight", 0], ["anaemia", "a disease that makes a person weak and pale because of too little iron", 0], ["rickets", "a disease that makes children's bones soft and bent", 0], ["scurvy", "a disease with bleeding gums caused by too little vitamin C", 0], ["goitre", "a swelling in the neck caused by lack of iodine", 0], ["night blindness", "difficulty seeing in dim light", 0], ["deficiency disease", "an illness caused by a lack of a nutrient"], ["famine", "a severe shortage of food in a region", 0], ["breastfeeding", "feeding a baby with the mother milk", 0], ["underweight", "weighing less than is healthy for one's height"]] }
        ]
    });

    X("communicable-diseases", "Communicable diseases", {
        i: "A communicable disease is one that spreads from one person to another. It is caused by germs: bacteria, viruses, fungi or parasites. Diseases spread through air, water, food, touch and insects. Non-communicable diseases such as diabetes do not spread.",
        r: "Colds and measles spread through the air. Cholera spreads through dirty water. Malaria is spread by mosquitoes. Ringworm spreads by touch.",
        k: ["Germs: bacteria, viruses, fungi, parasites.", "Ways of spreading: air, water, food, touch, insects.", "Prevent by hygiene, clean water, vaccines, nets.", "Isolate sick people."],
        e: ["How does cholera spread?", ["It is caused by germs in dirty water.", "By contaminated water or food."], "Through contaminated water or food"],
        d: D.table("How diseases spread", ["Way", "Example"], [["Air", "cold, measles, tuberculosis"], ["Water and food", "cholera, typhoid"], ["Insects", "malaria, yellow fever"], ["Touch", "ringworm, scabies"]]),
        m: "Thinking you can catch any disease by being near a sick person. It depends on how the disease spreads.",
        more: [["Epidemics", "An epidemic is when many people in one area catch a disease at the same time. A pandemic spreads across many countries. Health workers track and control them."], ["Symptoms and care", "Symptoms such as fever, cough, rash, pain or diarrhoea show that someone is ill. Go to the clinic early. Rest, drink fluids and take only the medicine you are given."]],
        act: ["Disease chart", ["List four communicable diseases.", "Write how each spreads.", "Write how each can be prevented."]],
        sum: "Communicable diseases spread by germs, but we can prevent them by hygiene, vaccines and clean surroundings."
    }, {
        cats: { "disease spread through the air": ["common cold", "measles", "tuberculosis", "influenza"], "disease spread by contaminated water or food": ["cholera", "typhoid", "dysentery", "hepatitis A"], "disease spread by insects": ["malaria", "yellow fever", "sleeping sickness", "dengue fever"], "disease spread by touch": ["ringworm", "scabies", "conjunctivitis", "trachoma"] },
        pairs: [["disease", "an illness that affects the body", 0], ["communicable disease", "a disease that spreads from one person to another"], ["non-communicable disease", "a disease that does not spread from person to person"], ["bacteria", "tiny living things, some of which cause disease", 0], ["virus", "a tiny germ that can only live inside living cells"], ["fungus", "a type of living thing, some of which cause skin disease"], ["parasite", "a living thing that lives on or in another and harms it"], ["infection", "the entry of germs into the body that makes a person ill", 0], ["epidemic", "a disease that spreads quickly to many people in an area"], ["pandemic", "an epidemic that spreads across many countries"], ["carrier", "a person or animal that spreads a disease without being ill"], ["vector", "an animal that carries disease germs from one host to another"], ["symptom", "a sign that shows a person is ill"], ["quarantine", "keeping sick or exposed people apart to stop a disease spreading", 0], ["immunity", "the ability of the body to resist a disease", 0], ["tuberculosis", "a lung disease caused by bacteria and spread by coughing", 0]]
    });

    X("malaria", "Malaria and mosquito control", {
        i: "Malaria is a serious disease caused by a parasite (Plasmodium) spread by the bite of the female Anopheles mosquito. Symptoms include fever, chills, headache and body pains. It is prevented by killing mosquitoes and avoiding bites; it is treated with antimalarial drugs prescribed by health workers.",
        r: "Sleep under an insecticide-treated net, clear stagnant water, fit window screens and visit the clinic when you have a fever.",
        k: ["Cause: Plasmodium parasite.", "Spread: female Anopheles mosquito.", "Prevent: nets, screens, clearing stagnant water, repellents.", "Treat: antimalarial drugs from a health worker."],
        e: ["Which insect spreads malaria?", ["It bites at night.", "The female Anopheles mosquito."], "The female Anopheles mosquito"],
        d: D.cycle("Mosquito life cycle", ["Egg in still water", "Larva (wriggler)", "Pupa", "Adult mosquito"]),
        m: "Thinking malaria is caused by eating too much oil or by the sun. It is caused by a parasite spread by mosquitoes.",
        more: [["Breeding places", "Mosquitoes lay eggs in stagnant water in tins, tyres, gutters and pots. Clearing and covering these places cuts the number of mosquitoes."], ["Treatment", "A person with fever should have a malaria test at a clinic. The recommended treatment is artemisinin-based combination therapy (ACT). Do not self-medicate; finish the full course."]],
        act: ["Mosquito hunt", ["Look around your home for places with stagnant water.", "List five places and how to fix each.", "Make a poster on preventing malaria."]],
        sum: "Prevent malaria by avoiding mosquito bites and stopping mosquito breeding; seek treatment early."
    }, {
        pairs: [["malaria", "a serious disease spread by the bite of an infected mosquito", 0], ["Anopheles mosquito", "the type of mosquito that spreads malaria"], ["Plasmodium", "the parasite that causes malaria", 0], ["breeding site", "a place where mosquitoes lay their eggs"], ["mosquito net", "a net hung over a bed to keep mosquitoes away"], ["insecticide", "a chemical that kills insects"], ["repellent", "a substance that keeps insects away"], ["window screen", "wire mesh on a window that keeps insects out"], ["larvicide", "a chemical put in water to kill mosquito larvae"], ["ACT", "the recommended combination of drugs used to treat malaria", 0], ["antimalarial drug", "a medicine that treats or prevents malaria"], ["fever", "a body temperature higher than normal"], ["chills", "shivering with a feeling of cold", 0], ["stagnant water", "water that does not flow and where mosquitoes breed", 0], ["World Malaria Day", "the day on 25 April set aside to fight malaria", 0], ["larva", "the wriggling water stage of a mosquito"]]
    });

    X("water-borne-diseases", "Water-borne diseases", {
        i: "Water-borne diseases are spread by drinking or using water contaminated with germs: cholera, typhoid, dysentery, diarrhoea, guinea worm, bilharzia and polio. Prevent them with safe water, clean toilets, handwashing and good food hygiene.",
        r: "A baby with watery diarrhoea can lose too much water (dehydration). Oral rehydration solution (ORS) helps. Boil or treat water before drinking.",
        k: ["Cholera: severe watery diarrhoea.", "Typhoid: fever caused by germs in food or water.", "Boil or treat water; wash hands.", "Treat dehydration with ORS and see a health worker."],
        e: ["What should you give to a person with diarrhoea to prevent dehydration?", ["The body loses water and salts.", "Replace with ORS."], "Oral rehydration solution (ORS)"],
        d: D.flow("Breaking the chain", ["Dirty water or food has germs", "Germs enter by drinking or eating", "Illness: diarrhoea, fever", "Break the chain: boil water, wash hands, use toilets"]),
        m: "Thinking diarrhoea is only mild. It can kill children by dehydration.",
        more: [["Making ORS", "Mix one litre of clean boiled water with six level teaspoons of sugar and half a level teaspoon of salt, or use ready-made ORS sachets. Give small sips often."], ["Other water diseases", "Guinea worm comes from drinking water with tiny water fleas that carry the worm. Bilharzia comes from swimming in ponds with infected snails."]],
        act: ["Water safety poster", ["Draw three ways to make water safe.", "Add two hand-washing times.", "Display it in your classroom."]],
        sum: "Safe water, clean toilets and washed hands prevent water-borne diseases."
    }, {
        pairs: [["cholera", "a disease with severe watery diarrhoea caused by bacteria in dirty water", 0], ["typhoid fever", "a fever caused by bacteria in contaminated food or water", 0], ["dysentery", "a disease of the gut that causes diarrhoea with blood", 0], ["diarrhoea", "frequent loose watery stools", 0], ["dehydration", "the loss of too much water from the body", 0], ["oral rehydration solution", "a mixture of sugar, salt and clean water used to treat dehydration", 0], ["guinea worm", "a long worm that lives under the skin and is caught from dirty water"], ["bilharzia", "a disease caused by worms from snails in slow water", 0], ["polio", "a disease that can cause paralysis, prevented by vaccine", 0], ["hepatitis A", "a liver disease spread by dirty food or water", 0], ["contaminated water", "water that has harmful germs or chemicals in it", 0], ["boiling", "heating water until it bubbles to kill germs", 0], ["water filter", "a device that removes dirt and some germs from water"], ["handwashing", "cleaning the hands with soap and water", 0], ["vomiting", "bringing food up from the stomach through the mouth", 0], ["sanitary latrine", "a clean toilet that keeps waste away from water and food"]]
    });

    X("hiv-aids", "HIV/AIDS", {
        i: "HIV is a virus that weakens the body's defences (immune system). Without treatment it can lead to AIDS. HIV spreads through infected blood, from an infected mother to her baby, and through unprotected sex. It does not spread by touching, hugging, sharing food or mosquito bites. Medicines (ARVs) allow people with HIV to live long lives.",
        r: "A person with HIV can go to school and play with friends safely. Using new needles and tested blood, and avoiding sex at a young age, protect against HIV.",
        k: ["HIV spreads by infected blood, mother to baby and unprotected sex.", "It does not spread by touch, hugging or sharing food.", "ARVs control HIV.", "Do not discriminate against people living with HIV."],
        e: ["Can you catch HIV by shaking hands?", ["HIV needs body fluids.", "Casual contact is safe."], "No"],
        d: D.cards("HIV facts", [["Spreads by", "infected blood, mother to baby, unprotected sex"], ["Does not spread by", "hugging, sharing food, mosquitoes"], ["Treatment", "ARVs control the virus"], ["Attitude", "be kind; stop stigma"]]),
        m: "Believing that HIV spreads by touching or sharing a plate. It does not.",
        more: [["Prevention", "Abstain from sex until adulthood, avoid sharing needles or razor blades, use only tested blood for transfusion and get tested and treated early during pregnancy."], ["Stigma", "Stigma is unfair treatment of people because of illness. It stops people from seeking help. Support, kindness and correct information help everyone. World AIDS Day is on 1 December."]],
        act: ["Myth or fact", ["Write five statements about HIV.", "Mark each as myth or fact.", "Correct the myths."]],
        sum: "HIV is preventable and treatable; accurate knowledge and kindness protect everyone."
    }, {
        cats: { "way HIV can spread": ["unscreened blood transfusion", "sharing needles", "an infected mother to her baby", "unprotected sex with an infected person", "sharing razor blades"], "way HIV cannot spread": ["hugging", "shaking hands", "sharing a plate", "mosquito bites", "using the same toilet", "playing together"] },
        pairs: [["HIV", "the virus that weakens the body defence against disease", 0], ["AIDS", "the illness that develops when HIV has badly damaged the immune system", 0], ["immune system", "the body defences that fight germs"], ["antiretroviral drug", "a medicine that controls HIV"], ["transmission", "the passing of a germ from one person to another", 0], ["stigma", "unfair treatment of people because of their illness", 0], ["discrimination", "treating a person worse because of who they are or what illness they have", 0], ["HIV test", "a test that shows whether a person has HIV"], ["counselling", "advice and support from a trained person", 0], ["prevention", "actions taken to stop something from happening", 0], ["safe blood", "blood that has been tested before a transfusion", 0], ["abstinence", "choosing not to have sex", 0], ["sharp object", "an item such as a needle or blade that can cut the skin"], ["infected blood", "blood that carries a germ such as HIV", 0], ["World AIDS Day", "the day on 1 December set aside to remember and support people living with HIV", 0], ["support group", "people who meet to help one another cope with an illness"]]
    });

    X("immunisation", "Immunisation and disease prevention", {
        i: "Immunisation protects the body against disease by giving a vaccine. A vaccine helps the body to make antibodies so it can fight a germ if it arrives later. Children receive vaccines such as BCG, polio, measles and others on a schedule at primary health centres.",
        r: "Babies are taken to the clinic for vaccines and a record is kept on the immunisation card. Smallpox was wiped out by vaccination.",
        k: ["Vaccines build immunity without causing the disease.", "BCG: tuberculosis; OPV: polio; measles vaccine.", "Keep the vaccination card safe.", "Vaccines must be kept cold (cold chain)."],
        e: ["Which vaccine protects against polio?", ["Usually given as drops.", "OPV."], "OPV (oral polio vaccine)"],
        d: D.flow("How a vaccine works", ["A weakened or dead germ (vaccine) is given", "The body makes antibodies", "The body remembers the germ", "If the real germ comes, it is fought quickly"]),
        m: "Thinking vaccines give you the disease. They do not; any side effects are mild.",
        more: [["Vaccination schedule", "A schedule shows when each vaccine should be given from birth. Some vaccines need booster doses. Follow the dates on the card."], ["Why vaccinate", "Vaccination protects the child and the community. When most people are vaccinated, diseases spread less. Edward Jenner developed the first vaccine against smallpox."]],
        act: ["Vaccine card", ["Design a vaccine card with name, date and vaccine.", "Fill it in for a pretend baby.", "Explain why it must be kept safe."]],
        sum: "Vaccines build immunity and prevent many deadly diseases."
    }, {
        pairs: [["immunisation", "protecting the body against disease by giving a vaccine", 0], ["vaccine", "a medicine that prepares the body to fight a particular disease"], ["immunity", "the ability of the body to resist a disease", 0], ["antibody", "a substance made by the body to fight germs"], ["booster dose", "an extra dose of a vaccine that keeps immunity strong"], ["vaccination card", "a card that records the vaccines a child has received"], ["BCG", "the vaccine that protects against tuberculosis", 0], ["OPV", "the oral vaccine that protects against polio", 0], ["measles vaccine", "the vaccine that protects against measles"], ["cold chain", "the system that keeps vaccines cold from the factory to the clinic"], ["smallpox", "the first disease that people wiped out by vaccination", 0], ["primary health centre", "a clinic that gives basic health care in a community"], ["immunisation schedule", "a plan showing when each vaccine should be given"], ["side effect", "a mild unwanted effect of a medicine, such as a sore arm"], ["injection", "a way of giving medicine through a needle into the body"], ["tetanus vaccine", "the vaccine that protects against tetanus"]]
    });

    X("drug-abuse", "Drug use and abuse", {
        i: "A drug is a substance that changes how the body or mind works. Medicines are drugs used to treat illness and should be taken only as a doctor or pharmacist directs. Drug abuse is the wrong or harmful use of drugs. It can cause addiction, illness and death.",
        r: "Taking cough syrup or tablets just to feel high is drug abuse. Smoking, alcohol and cannabis harm young bodies and brains. Say no and tell a trusted adult.",
        k: ["Use medicine only as prescribed.", "Never share or buy drugs from roadside sellers.", "Addiction is hard to break.", "Say no to peer pressure."],
        e: ["Who should decide which medicine you take?", ["A trained person must prescribe.", "A doctor or pharmacist."], "A doctor or pharmacist"],
        d: D.cards("Safe medicine use", [["Do", "follow the prescription, check the expiry date, buy from a pharmacy"], ["Do not", "self-medicate, share drugs, take extra"], ["Help", "tell a trusted adult, use counselling"]]),
        m: "Thinking that if a little medicine is good, more is better. An overdose can be deadly.",
        more: [["Effects of abuse", "Drug abuse can damage the brain, liver and lungs, cause mental illness, poor school work, accidents and crime. Addiction is a strong need to keep taking a drug."], ["Getting help", "Teachers, parents, counsellors, health centres and the National Drug Law Enforcement Agency (NDLEA) can help people stop. Rehabilitation gives treatment and support."]],
        act: ["Say no skills", ["Write three ways to refuse a drug politely.", "Practise with a partner.", "List three trusted adults to talk to."]],
        sum: "Medicines help when used properly; abusing drugs harms the body, mind and future."
    }, {
        cats: { "safe way of using medicine": ["following the doctor's prescription", "checking the expiry date", "buying from a licensed pharmacy", "finishing the full course", "keeping medicine away from children", "reading the label"], "unsafe use of drugs": ["self-medication", "sharing prescribed drugs", "taking more than the dose", "buying from roadside hawkers", "mixing drugs without advice", "using expired drugs"] },
        pairs: [["drug", "a substance that changes how the body or mind works"], ["medicine", "a drug used to treat or prevent illness"], ["drug abuse", "the wrong or harmful use of drugs", 0], ["addiction", "a strong need to keep using a drug that is hard to stop", 0], ["overdose", "taking too much of a drug", 0], ["prescription", "a doctor's written order for a medicine"], ["pharmacist", "a trained person who prepares and gives out medicines"], ["dosage", "the amount of medicine to take at one time", 0], ["self-medication", "taking drugs without a doctor's advice", 0], ["peer pressure", "the pressure from friends to do something", 0], ["NDLEA", "the National Drug Law Enforcement Agency of Nigeria", 0], ["rehabilitation", "treatment and support that helps a person stop using drugs", 0], ["fake drug", "a medicine that is not genuine and may harm the user"], ["tobacco", "a plant whose leaves are smoked and which causes lung disease", 0], ["alcohol", "a drink that can harm the body and is not for children", 0], ["side effect", "a mild unwanted effect of a medicine"]]
    });

    X("first-aid", "First aid", {
        i: "First aid is the first help given to an injured or ill person before a doctor or ambulance arrives. Its aims are to save life, prevent the condition from getting worse and help recovery. Always stay calm, make sure the place is safe and call for help.",
        r: "If a classmate cuts a finger, press on the cut with a clean cloth. For a burn, cool it under running water. In Nigeria the emergency number is 112.",
        k: ["Stay calm; check for danger; call for help.", "Bleeding: press firmly with a clean cloth.", "Burn: cool with clean running water for 10 minutes.", "Fracture: keep still; do not move the limb."],
        e: ["What should you do first for a minor burn?", ["The heat must be taken out.", "Cool with clean running water."], "Cool it under clean running water"],
        d: D3.firstaid(),
        m: "Putting toothpaste, oil or butter on a burn. These can cause infection; use cool water.",
        more: [["The first aid box", "It should hold plasters, bandages, gauze, antiseptic, scissors, gloves, a thermometer and a list of emergency numbers. Check it regularly."], ["When to get help", "Call for help at once for heavy bleeding, difficulty breathing, unconsciousness, fractures, snake bites and serious burns."]],
        act: ["First aid practice", ["Practise bandaging a pretend wound on a partner.", "Show the recovery position.", "Name five items in a first aid box."]],
        sum: "Calm, quick and correct first aid can save a life while waiting for professional help."
    }, {
        sets: [
            { style: "fact", ctx: "injury or situation", pairs: [["a bleeding wound", "should be pressed firmly with a clean cloth"], ["a burn", "should be cooled under clean running water for about ten minutes"], ["a nosebleed", "is treated by leaning forward and pinching the soft part of the nose"], ["a fracture", "should be kept still and supported until help arrives"], ["a fainting person", "should be laid down with the legs raised"], ["a sprain", "is treated with rest, ice, a bandage and raising the limb"], ["a snake bite", "needs the person to stay calm and be taken to hospital quickly"], ["an unconscious person who is breathing", "should be placed in the recovery position"], ["a choking person", "may be helped with firm back slaps"]] },
            { pairs: [["first aid", "the first help given to an injured or ill person before a doctor arrives", 0], ["first aider", "a person trained to give first aid"], ["first aid box", "a box of items for treating small injuries"], ["bandage", "a strip of cloth used to cover a wound or support a limb"], ["plaster", "a small sticky dressing for a minor cut"], ["antiseptic", "a liquid that kills germs on the skin"], ["gauze", "a thin soft cloth used to cover a wound", 0], ["sterile", "free from all living germs", 0], ["wound", "a cut or break in the skin"], ["burn", "an injury caused by heat"], ["scald", "a burn caused by hot liquid or steam"], ["fracture", "a broken bone"], ["sprain", "a twisted joint with damage to its ligaments"], ["recovery position", "lying a person on their side so they can breathe safely", 0], ["emergency number", "the telephone number to call for urgent help", 0], ["ambulance", "a vehicle that carries sick or injured people to hospital"]] }
        ]
    });

    X("safety-home-school-road", "Home, school and road safety", {
        i: "Accidents can happen at home, at school and on the road. Safety rules prevent them: keep dangerous things out of children's reach, walk and do not run in corridors, and use zebra crossings and obey traffic lights. Drivers wear seat belts and motorcyclists wear helmets.",
        r: "On the way to school cross at the zebra crossing or footbridge. At home keep matches and medicines locked away. The Federal Road Safety Corps (FRSC) promotes road safety.",
        k: ["Look right, left, right before crossing.", "Obey road signs and traffic lights.", "Keep matches, chemicals and medicines away from small children.", "Report hazards to a teacher or adult."],
        e: ["When can pedestrians cross at traffic lights?", ["Red means stop for cars.", "Cross when the pedestrian signal is green and the road is clear."], "When the pedestrian signal says go and the road is clear"],
        d: D3.road(),
        m: "Crossing the road while looking at a phone. Always look and listen.",
        more: [["Safety at home", "Keep pot handles turned inwards, cover sockets, store chemicals in labelled containers, keep floors dry and never play with matches or fire."], ["Safety at school", "Walk in corridors, do not push on stairs, use playground equipment properly, follow fire drill and report bullying or damage."]],
        act: ["Safety map", ["Draw a map of your home to school route.", "Mark crossing places and dangers.", "Add one safety rule for each danger."]],
        sum: "Knowing and following safety rules at home, school and on the road prevents accidents."
    }, {
        cats: { "safe action on the road": ["using the zebra crossing", "wearing a seat belt", "looking left and right before crossing", "walking on the footpath", "wearing a helmet on a motorcycle", "obeying traffic lights"], "unsafe action on the road": ["crossing between parked cars", "playing on the road", "boarding a moving vehicle", "standing in the bus doorway", "running across a highway", "riding a motorcycle without a helmet"], "safe action at home": ["keeping medicines locked up", "switching off the gas", "covering sockets", "keeping sharp objects from young children", "storing chemicals in labelled containers"], "dangerous action at home": ["leaving a pot handle sticking out", "playing with matches", "leaving a stove unattended", "touching electrical wires", "tasting unknown substances"] },
        pairs: [["pedestrian", "a person who travels on foot"], ["zebra crossing", "black and white stripes on a road where pedestrians may cross"], ["traffic light", "a signal with red, amber and green lights that controls traffic"], ["road sign", "a sign that gives drivers and pedestrians information or warnings"], ["helmet", "a hard hat that protects the head of a motorcycle rider or cyclist"], ["seat belt", "a strap that holds a passenger in place during a sudden stop"], ["FRSC", "the Federal Road Safety Corps of Nigeria", 0], ["speed limit", "the highest speed allowed on a road"], ["footpath", "a path at the side of the road for pedestrians"], ["overloading", "carrying more people or goods than a vehicle should", 0], ["hazard", "anything that can cause harm"], ["drowning", "dying because water has filled the lungs", 0], ["smoke alarm", "a device that sounds when it detects smoke"], ["fire exit", "a door used to leave a building in a fire"], ["bully", "a person who hurts or frightens weaker people"], ["footbridge", "a bridge for pedestrians to cross a busy road"]]
    });

    X("fitness-exercise", "Physical fitness and exercise", {
        i: "Physical fitness is the ability to do daily tasks without too much tiredness. Regular exercise makes muscles, bones, heart and lungs stronger, improves mood and helps sleep. The parts of fitness are strength, endurance, flexibility, speed, agility and balance.",
        r: "Running in games lessons, skipping, football, swimming and walking to school are all good exercise. Warm up before and cool down after.",
        k: ["Exercise 60 minutes a day as a child.", "Warm up before and cool down after.", "Drink water and rest when tired.", "Track events: sprints, relays; field events: jumps, throws."],
        e: ["Why do we warm up before exercise?", ["Cold muscles can be injured.", "A warm-up prepares them."], "To prepare the muscles and prevent injury"],
        d: D.cards("Parts of fitness", [["Strength", "power of muscles"], ["Endurance", "keep going a long time"], ["Flexibility", "bending and stretching"], ["Speed and agility", "move fast and change direction"]]),
        m: "Exercising hard straight away without warming up. This can cause muscle injuries.",
        more: [["Athletics", "Athletics includes track events such as the 100 metres, 400 metres, relay and hurdles, and field events such as long jump, high jump, shot put, javelin and discus."], ["Team games and fair play", "Football, volleyball and basketball teach teamwork. A referee makes sure the rules are followed. Sportsmanship means being fair and polite whether you win or lose."]],
        act: ["Fitness routine", ["Plan a ten-minute warm-up.", "Add three simple exercises.", "End with a cool-down.", "Try it with your class."]],
        sum: "Regular exercise keeps the body strong and the mind happy."
    }, {
        cats: { "track event": ["100 metres", "400 metres", "relay", "hurdles", "1500 metres"], "field event": ["long jump", "high jump", "javelin", "shot put", "discus", "triple jump"] },
        pairs: [["physical fitness", "the ability to carry out daily tasks without too much tiredness", 0], ["exercise", "physical activity done to keep the body healthy", 0], ["aerobic exercise", "exercise such as running that makes the heart and lungs work harder", 0], ["strength", "the power of the muscles to lift or push", 0], ["endurance", "the ability to keep going for a long time", 0], ["flexibility", "the ability to bend and stretch easily", 0], ["agility", "the ability to change direction quickly", 0], ["balance", "the ability to stay steady without falling", 0], ["warm-up", "light exercise done to prepare the body for activity"], ["cool-down", "gentle exercise after activity to let the body relax"], ["pulse rate", "the number of heartbeats in one minute", 0], ["athletics", "a group of sports that includes running, jumping and throwing", 0], ["relay race", "a race in which team members run in turns and pass a baton"], ["team game", "a game played by two groups of players"], ["sportsmanship", "fair and polite behaviour in sports", 0], ["referee", "the official who makes sure the rules of a game are followed"]]
    });

    X("posture-rest-sleep", "Posture, rest and sleep", {
        i: "Posture is the way we hold our bodies when we sit, stand or walk. Good posture protects the spine and muscles. Rest and sleep let the body recover and grow. Children aged six to twelve need about nine to twelve hours of sleep each night.",
        r: "Sit with your back straight and feet flat on the floor. Carry your school bag on both shoulders. Go to bed early and avoid screens before sleep.",
        k: ["Keep your back straight when sitting.", "Do not carry a heavy bag on one shoulder.", "Sleep 9 to 12 hours; keep a regular bedtime.", "Relax with hobbies, play and quiet time."],
        e: ["How many hours of sleep does a primary school child need?", ["Children need more sleep than adults.", "About nine to twelve hours."], "About 9 to 12 hours"],
        d: D.cards("Healthy habits", [["Sitting", "back straight, feet flat"], ["Standing", "head up, shoulders back"], ["Carrying", "bag on both shoulders"], ["Sleeping", "9 to 12 hours; regular bedtime"]]),
        m: "Staying up late to study all night. Enough sleep helps the brain learn and remember.",
        more: [["Rest and recreation", "Rest can be sleep or quiet activity. Recreation such as games, music, reading or hobbies relaxes the mind and reduces stress."], ["Too much screen time", "Long hours on phones and TVs can hurt the eyes, reduce sleep and exercise and cause neck and back pain. Take breaks and limit screen time."]],
        act: ["Posture check", ["Sit at your desk and check your back, feet and neck.", "Ask a partner to give feedback.", "Make a poster on good posture."]],
        sum: "Good posture, enough sleep and balanced rest keep the body and mind healthy."
    }, {
        sets: [
            { style: "fact", ctx: "habit or thing", pairs: [["a child aged six to twelve", "needs about nine to twelve hours of sleep a night"], ["a heavy school bag", "should be carried on both shoulders"], ["sitting with a straight back", "keeps the spine healthy"], ["too much screen time", "can reduce sleep and tire the eyes"], ["a good chair", "supports the back and lets the feet rest flat on the floor"], ["enough sleep", "helps the body to grow and the brain to learn"], ["regular exercise", "helps a person to sleep well"], ["a quiet dark room", "helps a person to fall asleep"], ["a short nap", "can refresh the body but should not replace night sleep"]] },
            { pairs: [["posture", "the way we hold our bodies when we sit, stand or walk", 0], ["good posture", "holding the body straight and balanced", 0], ["slouching", "sitting or standing with a rounded back", 0], ["spine", "the backbone that supports the body"], ["back pain", "pain in the muscles or bones of the back", 0], ["sleep", "a natural resting state in which the body and brain recover", 0], ["rest", "a time of low activity that lets the body recover", 0], ["relaxation", "the calm feeling of being free from tension", 0], ["stress", "a feeling of being under too much pressure", 0], ["recreation", "activities done for enjoyment and relaxation", 0], ["hobby", "an activity done for pleasure in free time"], ["bedtime routine", "the same calming steps followed each night before sleep"], ["screen time", "the time spent using screens", 0], ["nap", "a short sleep during the day"], ["fatigue", "extreme tiredness", 0], ["stretching", "gently lengthening the muscles", 0]] }
        ]
    });
})(typeof window !== 'undefined' ? window : globalThis);
