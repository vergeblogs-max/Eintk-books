
// Syllabus data representing the National Unified Syllabus (WAEC & JAMB)

export const SYLLABUS_DATA: Record<string, { id: string; topic: string; subtopics?: string[]; outcomes?: string }[]> = {
    "English Language": [
        { 
            id: "eng_1", 
            topic: "Oral English (Phonetics)", 
            subtopics: ["Vowel and Consonant Sounds: Monophthongs, Diphthongs, Consonants (Place and Manner of Articulation)", "Stress and Intonation: Word Stress, Sentence Stress, Intonation Patterns (Falling, Rising)", "Consonant Clusters, Rhymes, Phonetic Symbols", "Listening Comprehension"],
            outcomes: "Identify, produce, and differentiate all vowel and consonant sounds. Apply knowledge of phonetics to distinguish minimal pairs. Accurately place stress on words and sentences for communicative effect. Determine the meaning conveyed by different intonation patterns."
        },
        { 
            id: "eng_2", 
            topic: "Lexis and Structure", 
            subtopics: ["Parts of Speech & Usage: Nouns, Verbs, Adjectives, Adverbs, Prepositions, Conjunctions", "Tense and Aspect: Simple, Continuous, Perfect forms; Sequence of Tense, Modals", "Active and Passive Voice, Direct and Indirect Speech", "Clauses and Phrases, Punctuation Marks", "Question Tags, Spelling Rules"],
            outcomes: "Identify the function and form of all parts of speech. Correctly apply rules of Concord/Agreement. Accurately apply Tense forms to indicate time reference and duration."
        },
        { 
            id: "eng_3", 
            topic: "Comprehension & Summary", 
            subtopics: ["Reading Skills: Skimming, Scanning, Inferring, Identifying Tone and Purpose", "Summary Writing: Conciseness, use of own words, eliminating redundancy"],
            outcomes: "Extract explicit and implicit information from diverse passages. Deduce the main idea, author's purpose, and logical conclusions. Condense a passage into a specified number of sentences, retaining core meaning."
        },
        {
            id: "eng_4", 
            topic: "Essay and Letter Writing",
            subtopics: ["Narrative, Descriptive, Argumentative, Expository Essays", "Formal, Informal, and Semi-formal Letters", "Article, Speech, and Report Writing"],
            outcomes: "Write coherent essays in various formats. Master the conventions of formal and informal correspondence."
        },
        {
            id: "eng_5", 
            topic: "Vocabulary Development (Registers)",
            subtopics: ["Registers for Sports, ICT, Health, Legal, and Government", "Registers for Religion, Commerce, and Professional Trades"],
            outcomes: "Identify and use vocabulary specific to various social and professional fields."
        }
    ],
    "Mathematics": [
        { 
            id: "math_1", 
            topic: "Arithmetic & Numeration", 
            subtopics: ["Number Bases, Modular Arithmetic, Indices, Logarithms, Surds", "Ratio, Proportion, Rate, Percentages, Commercial Arithmetic", "Sets and Venn Diagrams", "Variation (Direct, Inverse, Joint, Partial)"],
            outcomes: "Convert fluently between base systems. Apply laws of indices and logarithms. Solve problems involving profit/loss, simple/compound interest, and taxation."
        },
        { 
            id: "math_2", 
            topic: "Algebra", 
            subtopics: ["Equations and Inequalities: Linear, Simultaneous, Quadratic (all methods), Inequalities", "Sequences and Series: AP and GP", "Binary Operations, Change of Subject of Formula", "Polynomials (Remainder and Factor Theorems)"],
            outcomes: "Solve systems of equations. Interpret quadratic roots. Solve linear/quadratic inequalities. Calculate terms and sums for AP and GP."
        },
        { 
            id: "math_3", 
            topic: "Geometry and Trigonometry", 
            subtopics: ["Plane Geometry & Mensuration: Polygons, Circle Theorems, Area and Volume of solids", "Trigonometry: Ratios, Sine/Cosine rules, Angles of Elevation/Depression", "Longitude and Latitude (Great and Small Circles)", "Coordinate Geometry (Gradient, Midpoint, and Distance Formulas)"],
            outcomes: "Apply circle theorems. Calculate surface area/volume of 3D shapes. Use Sine/Cosine rules for triangles."
        },
        { 
            id: "math_4", 
            topic: "Statistics and Probability", 
            subtopics: ["Data Presentation: Frequency Tables, Graphs (Histogram, Ogive)", "Measures of Central Tendency (Mean, Median, Mode, Grouped Data)", "Measures of Dispersion (Range, Variance, Standard Deviation)"],
            outcomes: "Construct/interpret graphical data. Calculate measures of central tendency and dispersion."
        },
        {
            id: "math_5", 
            topic: "Calculus and Matrices",
            subtopics: ["Basic Differentiation and Integration", "Matrices and Determinants"],
            outcomes: "Apply basic calculus to rates of change. Solve systems of equations using matrix methods."
        }
    ],
    "Physics": [
        { 
            id: "phy_1", 
            topic: "Mechanics", 
            subtopics: ["Motion and Vectors: Linear Motion equations, Scalars and Vectors, Projectile Motion", "Dynamics: Newton's Laws, Momentum, Impulse, Work, Energy, Power", "Elasticity (Hooke’s Law, Young’s Modulus)", "Pressure in Fluids (Pascal’s Principle, Archimedes' Principle)", "Surface Tension, Capillarity, Viscosity", "Simple Machines"],
            outcomes: "Solve problems using v=u+at. Resolve vectors. Apply conservation of momentum/energy. Calculate efficiency/MA/VR."
        },
        { 
            id: "phy_2", 
            topic: "Heat and Waves", 
            subtopics: ["Thermal Physics: Specific Heat Capacity, Latent Heat, Gas Laws", "Wave Motion and Optics: Wave equation, Sound and Light (Reflection, Refraction, TIR)", "Optical Instruments (Microscope, Telescope, Projector)", "Electromagnetic Waves (Spectrum and Properties)"],
            outcomes: "Use Q=mcΔθ. Apply gas laws. Solve wave characteristics problems. Apply Snell's Law."
        },
        { 
            id: "phy_3", 
            topic: "Electricity and Magnetism", 
            subtopics: ["DC Circuits: Ohm's Law, Resistance, Electric Power", "Resistors in Series and Parallel", "Electrical Energy and Power", "Heating Effect of Electric Current", "Cells and Batteries (Primary and Secondary Cells)", "Electromagnetism: Magnetic Field, Induction, Motors, Transformers"],
            outcomes: "Analyze circuits (voltage, current, resistance). Calculate electrical energy. Describe transformers and apply transformer formulas."
        },
        { 
            id: "phy_4", 
            topic: "Modern Physics", 
            subtopics: ["Atomic Structure, Radioactivity: Types of radiation, Half-life, Nuclear Fission/Fusion", "Wave-Particle Duality (De Broglie Equation)", "Uncertainty Principle", "X-ray Production and Applications"],
            outcomes: "Describe atom structure. Calculate remaining amount after half-life periods."
        },
        {
            id: "phy_5", 
            topic: "Fields and AC Circuits",
            subtopics: ["Gravitational, Electric, and Magnetic Fields", "Capacitors and Capacitance", "AC Circuits (Inductance, Capacitance, Reactance)"],
            outcomes: "Analyze field forces. Calculate parameters in alternating current circuits."
        }
    ],
    "Chemistry": [
        { 
            id: "chem_1", 
            topic: "Fundamental Concepts", 
            subtopics: ["Atomic Structure, Bonding, States of Matter, Separation Techniques", "Mole Concept & Stoichiometry: Empirical/Molecular Formula, Concentration", "Kinetic Theory of Matter, Gas Laws (Boyle’s, Charles’, Graham’s)", "Solubility and Solubility Curves"],
            outcomes: "Write electronic configurations. Explain ionic/covalent bonds. Perform mole concept and molarity calculations."
        },
        { 
            id: "chem_2", 
            topic: "Chemical Reactions", 
            subtopics: ["Acids, Bases, Salts, pH: Theories, Titration, Salt Preparation", "Equilibrium & Kinetics: Factors affecting rate, Le Chatelier's Principle", "Redox Reactions (Oxidation and Reduction)", "Electrolysis (Faraday’s Laws and Applications)", "Energetics (Exothermic and Endothermic Reactions)"],
            outcomes: "Perform volumetric analysis. Describe salt preparation. Explain collision theory. Predict equilibrium shifts."
        },
        { 
            id: "chem_3", 
            topic: "Organic Chemistry", 
            subtopics: ["Hydrocarbons: Alkanes, Alkenes, Alkynes (Nomenclature and Reactions)", "Alkanols (Ethanol Preparation)", "Organic Acids and Esters", "Polymers and Plastics (Addition and Condensation)", "Functional Groups: Alcohols, Carboxylic Acids, Esters, Soaps"],
            outcomes: "Name organic compounds (IUPAC). Distinguish saturated/unsaturated. Describe saponification and functional groups."
        },
        {
            id: "chem_4", 
            topic: "Chemistry of Elements and Environment",
            subtopics: ["Metals and Extraction (Iron, Aluminum, Copper)", "Non-Metals and Compounds (Carbon, Nitrogen, Sulfur, Chlorine)", "Water Treatment and Environmental Pollution"],
            outcomes: "Describe properties of elements and their industrial extraction. Discuss environmental conservation."
        },
        {
            id: "chem_5", 
            topic: "Quantitative Analysis",
            subtopics: ["Acid-Base Titrations", "Calculation of Molarity and Mass Concentration", "Gas Volumetry"],
            outcomes: "Perform stoichiometric calculations. Understand laboratory volumetric analysis."
        }
    ],
    "Biology": [
        { 
            id: "bio_1", 
            topic: "The Cell and Basic Biology", 
            subtopics: ["Cell Structure, Organelles, Cell Division (Mitosis, Meiosis)", "Classification and Ecology: Kingdoms, Taxonomy, Ecosystems, Food chains", "Micro-organisms in Action (Concept and Identification)", "Ecological Succession, Biomes, Population Studies", "Nutrient Cycles (Carbon and Nitrogen Cycles)"],
            outcomes: "Identify organelles. Compare Mitosis/Meiosis. Apply binomial nomenclature. Analyze ecosystem interactions."
        },
        { 
            id: "bio_2", 
            topic: "Physiology", 
            subtopics: ["Nutrition, Respiration, Transport, Excretion", "The Human Brain (Parts and Functions)", "The Endocrine System (Hormones and Glands)", "The Kidney (Structure and Osmoregulation)", "Coordination: Hormones and Nervous System", "Skeletal and Supporting Systems", "Sense Organs (The Human Eye and Ear)", "Human and Plant Reproduction"],
            outcomes: "Describe Photosynthesis/Respiration. Trace blood circulation. Explain kidney role. Describe hormones and reflex arc."
        },
        { 
            id: "bio_3", 
            topic: "Genetics and Evolution", 
            subtopics: ["Heredity and Variation: Mendelian Laws, DNA, RNA, Genes", "Evolution: Evidence, Theories (Natural Selection)"],
            outcomes: "Apply Mendel's Laws. Describe DNA structure. Explain natural selection and evolutionary evidence."
        },
        {
            id: "bio_4", 
            topic: "Adaptation and Regulation",
            subtopics: ["Adaptation for Survival", "Homeostasis (Thermoregulation and Osmoregulation)"],
            outcomes: "Explain how organisms adapt and maintain internal balance."
        },
        {
            id: "bio_5", 
            topic: "Applied Biology",
            subtopics: ["Public Health (Vaccination, Quarantine, Health Organizations)", "Food Preservation Methods", "Pests and Diseases of Crops"],
            outcomes: "Explain the importance of public health measures and agricultural pest control."
        }
    ],
    "Further Mathematics": [
        { 
            id: "fmath_1", 
            topic: "Advanced Algebra", 
            subtopics: ["Polynomials: Remainder and Factor Theorems, Roots of Equations", "Functions and Graphs: Logarithmic and Exponential Functions, Partial Fractions", "Matrices and Determinants, Linear Transformations", "Correlation and Regression"],
            outcomes: "Solve cubic/quartic equations. Sketch complex graphs. Decompose rational functions into partial fractions."
        },
        { 
            id: "fmath_2", 
            topic: "Calculus", 
            subtopics: ["Differentiation: Product, Quotient, Chain Rules; Tangents/Normals", "Integration: Substitution, Area under curves, Volume of Revolution"],
            outcomes: "Apply differentiation rules. Find turning points. Calculate definite integrals, areas, and volumes."
        },
        { 
            id: "fmath_3", 
            topic: "Mechanics", 
            subtopics: ["Vectors and Kinematics: Position, Velocity, Acceleration, Projectile Motion", "Statics (Moments and Friction)", "Dynamics (Newton’s Laws and Work-Energy Theorem)"],
            outcomes: "Perform vector operations in 2D/3D. Solve projectile trajectory problems."
        },
        { 
            id: "fmath_4", 
            topic: "Statistics", 
            subtopics: ["Permutation and Combination, Binomial Expansion, Probability Distributions"],
            outcomes: "Apply P and C to counting. Calculate probability using Binomial and Poisson distributions."
        },
        {
            id: "fmath_5", 
            topic: "Coordinate Geometry and 3D Vectors",
            subtopics: ["Conic Sections (Circle, Parabola, Ellipse, Hyperbola)", "Vectors in Three Dimensions"],
            outcomes: "Analyze equations of conic sections. Perform vector operations in 3D space."
        }
    ],
    "Technical Drawing": [
        { 
            id: "td_1", 
            topic: "Instruments & Geometry", 
            subtopics: ["Instrument Care, Lettering, Dimensioning", "Geometric Constructions (Loci, Tangents, Polygons)", "Freehand Sketching and Pictorial Drawing"],
            outcomes: "Use instruments accurately. Construct loci (e.g., Cycloid, Involute)."
        },
        { 
            id: "td_2", 
            topic: "Projection", 
            subtopics: ["Orthographic Projection: First/Third Angle", "Pictorial Projection: Isometric, Oblique, Perspective"],
            outcomes: "Draw front/plan/end views. Draw 3D views from 2D orthographic views."
        },
        { 
            id: "td_3", 
            topic: "Development and Intersection", 
            subtopics: ["Development of Surfaces: Prisms, Cylinders, Cones", "Interpenetration: Intersection of simple solids"],
            outcomes: "Construct true shape of surfaces (nets). Determine lines of interpenetration."
        },
        {
            id: "td_4", 
            topic: "Building and Machine Drawing",
            subtopics: ["Building Plans, Foundations, Roofs, and Walls", "Machine Drawing (Bolts, Nuts, Keys, and Gears)"],
            outcomes: "Interpret and draw architectural plans and mechanical components."
        }
    ],
    "Economics": [
        { 
            id: "econ_1", 
            topic: "Fundamentals", 
            subtopics: ["Scarcity, Choice, Opportunity Cost, PPC", "Economic Systems: Market, Command, Mixed", "Population and the Labor Market", "Agriculture and Industrialization in Nigeria"],
            outcomes: "Apply PPC to economic problems. Compare economic systems."
        },
        { 
            id: "econ_2", 
            topic: "Microeconomics", 
            subtopics: ["Demand, Supply, and Elasticity", "Elasticity of Demand and Supply (Price, Income, Cross)", "Theory of Production and Cost: Returns to Scale, Revenue Curves", "Market Structures (Perfect Competition, Monopoly, Oligopoly)"],
            outcomes: "Analyze shifts in demand/supply. Calculate elasticity. Determine firm equilibrium."
        },
        { 
            id: "econ_3", 
            topic: "Macroeconomics", 
            subtopics: ["National Income: GDP, GNP, Measurement", "Money, Banking, and International Trade: Central Bank, BOP", "Inflation and Deflation", "International Economic Organizations (ECOWAS, IMF, World Bank)"],
            outcomes: "Calculate National Income. Explain Central Bank roles. Analyze Balance of Payments. Analyze domestic macroeconomic challenges and the role of global economic bodies."
        }
    ],
    "Government": [
        { 
            id: "gov_1", 
            topic: "Basic Concepts", 
            subtopics: ["Power, Authority, Legitimacy, Sovereignty, State, Constitution", "Organs of Government: Legislature, Executive, Judiciary", "Democracy (Types, Features, and Merits)", "Rule of Law (Principles and Limitations)", "Separation of Powers and Checks and Balances"],
            outcomes: "Differentiate political concepts. Explain types of constitutions. Describe functions of government arms."
        },
        { 
            id: "gov_2", 
            topic: "Political Processes", 
            subtopics: ["Political Parties, Pressure Groups, Electoral Systems", "Federalism: Features, Distribution of Powers, Problems in Nigeria", "Public Opinion (Formation and Importance)", "Civil Service (Characteristics and Functions)", "Local Government (Structure, Functions, and Sources of Finance)"],
            outcomes: "Analyze electoral methods. Explain principles and challenges of Nigerian Federalism."
        },
        { 
            id: "gov_3", 
            topic: "Nigerian Government", 
            subtopics: ["Pre- and Post-Colonial Administration", "Indigenous Systems, Constitutional Development, Military Rule"],
            outcomes: "Describe pre-colonial structures. Discuss constitutional evolution and military intervention impacts."
        },
        {
            id: "gov_4", 
            topic: "International Relations",
            subtopics: ["Nigeria's Foreign Policy (Principles and Factors)", "International Organizations (UN, AU, ECOWAS, Commonwealth)", "Diplomatic Missions and World Peace"],
            outcomes: "Evaluate Nigeria's role in global politics. Explain the objectives of major international bodies."
        },
        {
            id: "gov_5", 
            topic: "Constitutional Development",
            subtopics: ["Pre-independence Constitutions (Clifford, Richards, Macpherson, Lyttelton)", "Post-independence Constitutions (1963, 1979, 1999)"],
            outcomes: "Trace the history of Nigerian governance through its various constitutions."
        }
    ],
    "Commerce": [
        { 
            id: "com_1", 
            topic: "Nature and Scope", 
            subtopics: ["Production, Distribution, Trade, Aids to Trade", "Business Units: Sole Trader, Partnership, Companies, Co-operatives", "History of Commerce in Nigeria", "E-Commerce (Internet Marketing, ATM, EFT)"],
            outcomes: "Explain Aids to Trade. Compare features/funding of business ownership forms."
        },
        { 
            id: "com_2", 
            topic: "Trade and Distribution", 
            subtopics: ["Retail and Wholesale Trade", "Foreign Trade: Exports, Imports, Documents", "Marketing (Concepts and Functions)", "Consumer Protection (Agencies like SON, NAFDAC, CPC)", "Warehousing (Types and Importance)"],
            outcomes: "Describe distribution channels. Interpret foreign trade documents. Explain international trade barriers."
        },
        { 
            id: "com_3", 
            topic: "Aids to Trade in Detail", 
            subtopics: ["Insurance: Principles, Policies, Tools for Commerce", "Banking: Central Bank of Nigeria (Functions/Monetary Policy)", "Commercial and Specialized Banks (BOI, BOA)", "Payment Instruments"],
            outcomes: "Apply insurance principles. Describe bank roles and communication media."
        },
        {
            id: "com_4", 
            topic: "Business Management and Finance",
            subtopics: ["Principles of Management", "Sources of Business Finance (Short-term and Long-term)", "Stock Exchange (Functions and Procedures)", "Capital Market and Money Market"],
            outcomes: "Explain management functions. Identify ways businesses raise capital through the stock market."
        }
    ],
    "Financial Accounting": [
        { 
            id: "acc_1", 
            topic: "Fundamentals", 
            subtopics: ["Double Entry System, Accounting Concepts", "Books of Original Entry: Day Books, Cash Book, Petty Cash", "Bank Reconciliation Statements", "Correction of Errors and Suspense Account"],
            outcomes: "Apply double entry principle. Explain accounting concepts. Post transactions to books."
        },
        { 
            id: "acc_2", 
            topic: "Final Accounts", 
            subtopics: ["Ledger, Trial Balance, Trading, Profit & Loss, Balance Sheet", "Final Accounts of Companies (Format and Statutory Requirements)", "Interpretation of Accounts (Ratios: Liquidity, Profitability)"],
            outcomes: "Prepare complete Final Accounts with adjustments."
        },
        { 
            id: "acc_3", 
            topic: "Special Accounts", 
            subtopics: ["Manufacturing Accounts", "Non-Profit Organizations", "Partnership Accounts (Admission, Retirement, Dissolution)", "Subscription and Allotment of Shares"],
            outcomes: "Prepare Manufacturing Accounts. Prepare Partnership Appropriation Accounts."
        },
        {
            id: "acc_4", 
            topic: "Public Sector and Specialized Accounting",
            subtopics: ["Public Sector Accounting (Sources of Revenue, Expenditure Control)", "Departmental and Branch Accounts", "Joint Venture Accounts", "Incomplete Records and Single Entry"],
            outcomes: "Prepare accounts for non-trading entities and companies. Calculate and interpret financial ratios."
        }
    ],
    "Geography": [
        { 
            id: "geo_1", 
            topic: "Practical Geography", 
            subtopics: ["Map Work: Scales, Relief (Contours), Bearings", "Time Calculation", "Surveying (Chain Survey)", "Statistical Mapping (Dot maps, Pie charts, Flow charts)", "Geographic Information System (GIS) Basics"],
            outcomes: "Read map scales. Interpret contour features. Determine location/time."
        },
        { 
            id: "geo_2", 
            topic: "Physical Geography", 
            subtopics: ["The Solar System (Sun and Planets)", "Earth's Rotation and Revolution", "Earth Structure & Geomorphology: Rocks (Igneous, Sedimentary, Metamorphic), Tectonics, Landforms", "Weather and Climate: Elements, Instruments, Climate Types", "Environmental Resources (Renewable and Non-renewable)", "Environmental Hazards (Erosion, Flooding, Drought)", "Soil (Types, Profiles, and Conservation)"],
            outcomes: "Describe rock formation. Explain crustal movements. Explain climate characteristics."
        },
        { 
            id: "geo_3", 
            topic: "Human and Regional Geography", 
            subtopics: ["Population and Settlement: Density, Migration, Settlement Types", "Economic Geography: Agriculture, Industry, Transport"],
            outcomes: "Interpret population pyramids. Analyze industrial location factors and Nigerian resources."
        },
        {
            id: "geo_4", 
            topic: "Regional Geography of Nigeria",
            subtopics: ["Nigeria: Physical Settings (Location, Size, Geology)", "Nigeria: Economic Settings (Agriculture, Power, Mining)", "Nigeria: Communication and Trade"],
            outcomes: "Describe the physical and economic landscape of Nigeria. Propose solutions to local environmental hazards."
        }
    ],
    "Literature-in-English": [
        { 
            id: "lit_1", 
            topic: "Literary Genres and Periods", 
            subtopics: ["Poetry, Prose, Drama: Features, Forms, Sub-genres", "Literary Periods (Romanticism, Modernism, Post-colonialism)", "Nigerian Oral Literature (Folktales, Myths, Proverbs)"],
            outcomes: "Identify characteristics of genres (Sonnet, Novella, Tragedy)."
        },
        { 
            id: "lit_2", 
            topic: "Literary Devices", 
            subtopics: ["Figurative Language: Simile, Metaphor, Irony", "Dramatic Elements: Plot, Characterization, Setting", "Enjambment, Caesura, Rhyme Scheme", "Dramatic Irony, Soliloquy, Aside", "Point of View (First-person, Third-person Omniscient)"],
            outcomes: "Analyze figures of speech. Analyze narrative structure and techniques."
        },
        { 
            id: "lit_3", 
            topic: "Analysis of Set Texts", 
            subtopics: ["Applied Analysis: Themes, Characterization, Setting (African/Non-African)"],
            outcomes: "Critically analyze socio-political and cultural themes in texts."
        },
        {
            id: "lit_4", 
            topic: "General Literary Appreciation",
            subtopics: ["Unseen Poetry and Prose (Techniques for Analysis)", "Comparison of African and Non-African Literary Styles"],
            outcomes: "Apply literary devices to analyze unseen texts. Contrast cultural nuances in different literatures."
        }
    ],
    "Christian Religious Studies (CRS)": [
        { 
            id: "crs_1", 
            topic: "Biblical Background", 
            subtopics: ["Old Testament: Creation, Covenant, Exodus, Mosaic Law", "Leadership (Joseph, Moses, Joshua)", "The Kingdom of Israel (Saul, David, Solomon)", "Prophets (Amos, Hosea, Isaiah)"],
            outcomes: "Analyze significance of Creation, Covenant, and the Law."
        },
        { 
            id: "crs_2", 
            topic: "Life and Teachings of Jesus", 
            subtopics: ["Birth, Ministry, Sermon on the Mount, Parables, Passion", "The Miracles of Jesus (Nature and Power)", "The Resurrection and Ascension"],
            outcomes: "Explain core moral teachings. State significance of Passion week."
        },
        { 
            id: "crs_3", 
            topic: "The Early Church", 
            subtopics: ["The Holy Spirit, Apostles (Peter, Paul), Growth and Challenges"],
            outcomes: "Describe role of Pentecost. Outline missionary journeys of Paul."
        },
        {
            id: "crs_4", 
            topic: "Christian Living in the Society",
            subtopics: ["Civic Responsibility (Taxes, Obedience to Authority)", "Christian Attitude to Work and Wealth", "The Christian Family"],
            outcomes: "Apply biblical principles to social and civic duties. Discuss the role of the family in the church."
        }
    ],
    "Islamic Studies (IS)": [
        { 
            id: "irs_1", 
            topic: "Islamic Faith (Iman)", 
            subtopics: ["Articles of Faith: Allah, Angels, Books, Messengers, Day of Judgment, Qadar"],
            outcomes: "Explain the six articles of faith and implications."
        },
        { 
            id: "irs_2", 
            topic: "Islamic Practice (Ibadah)", 
            subtopics: ["Five Pillars: Shahadah, Salat, Zakat, Sawm, Hajj", "Nikah (Marriage: Requirements and Importance)", "Talaq (Divorce: Procedures and Idah)", "Inheritance (Mirath) in Islam"],
            outcomes: "Describe conditions/benefits of pillars. Explain ritual purity. Explain Islamic social laws regarding marriage and wealth."
        },
        { 
            id: "irs_3", 
            topic: "Sources and History", 
            subtopics: ["Sources of Shariah: Qur'an and Sunnah", "History: Life of Prophet Muhammad, Khulafa'u Rashidun"],
            outcomes: "Discuss Qur'an/Hadith relationship. Narrate life of Prophet and Caliphs."
        },
        {
            id: "irs_4", 
            topic: "Islamic Moral and Social Teachings",
            subtopics: ["Adab (Etiquettes of Greeting, Eating, and Dressing)", "Islamic Economic System (Prohibition of Riba)", "Human Rights in Islam"],
            outcomes: "Demonstrate proper Islamic etiquettes."
        }
    ],
    "Agricultural Science": [
        { 
            id: "agric_1", 
            topic: "Fundamentals and Soil", 
            subtopics: ["Role of Agriculture, Ecological Factors", "Meaning and Importance of Agriculture", "Land Use and Land Tenure Systems", "Rock Formation and Soil Types", "Soil Fertility and Fertilizer Application"],
            outcomes: "Analyze agriculture's economic contribution. Determine climatic effects on production."
        },
        { 
            id: "agric_2", 
            topic: "Crop Production", 
            subtopics: ["Crop Types, Cultural Practices", "Classification of Crops (Life Cycle and Morphology)", "Plant Propagation Methods (Sexual and Asexual)", "Processing and Storage of Agricultural Produce", "Pasture and Forage Crops"],
            outcomes: "Classify crops. Outline cultivation steps. Describe IPM methods."
        },
        { 
            id: "agric_3", 
            topic: "Animal Science", 
            subtopics: ["Livestock Types, Nutrition", "Anatomy and Physiology of Farm Animals", "Livestock Management (Ruminants and Non-ruminants)", "Poultry Management (Chicks, Growers, Layers, Broilers)", "Fishery and Apiculture (Bee Keeping)", "Animal Nutrition and Feed Formulation", "Animal Health and Disease Control"],
            outcomes: "Classify feeds. Formulate rations. Identify disease symptoms and controls."
        },
        {
            id: "agric_4", 
            topic: "Agricultural Engineering and Economics",
            subtopics: ["Farm Power and Machinery (Tractors, Implements)", "Farm Surveying and Planning", "Agricultural Marketing and Extension", "Farm Records and Accounts"],
            outcomes: "Identify farm tools and machinery. Analyze agricultural market structures and maintain farm financial records."
        }
    ],
    "Home Management": [
        { 
            id: "hm_1", 
            topic: "Management Concepts", 
            subtopics: ["Home Location, Planning, Furnishing", "The Management Process (Planning, Organizing, Implementation, Evaluation)", "Values, Goals, Standards, and Needs", "Decision-making Processes", "Family Resources (Human and Material)"],
            outcomes: "Apply home planning principles. Discuss resource management."
        },
        { 
            id: "hm_2", 
            topic: "Family Living", 
            subtopics: ["Family Life Education", "Family Types and Life Cycle", "Marriage (Preparation and Systems)", "Pregnancy and Child Care (Immunization, Breastfeeding)", "Family Crisis and Conflict Resolution"],
            outcomes: "Develop time/energy schedules. Prepare family budget."
        },
        { 
            id: "hm_3", 
            topic: "Maintenance and Safety", 
            subtopics: ["Cleaning and Laundry Work", "Home Safety and First Aid"],
            outcomes: "Select cleaning methods. Administer basic first aid."
        },
        {
            id: "hm_4", 
            topic: "Consumer Education and Housing",
            subtopics: ["Consumer Rights and Protection Agencies (NAFDAC, SON)", "Housing: Selection and Interior Decoration", "Household Linens and Kitchen Management"],
            outcomes: "Identify consumer rights. Apply principles of home decoration and efficient kitchen management."
        }
    ],
    "Visual Arts": [
        { 
            id: "art_1", 
            topic: "Basic Art", 
            subtopics: ["Elements: Line, Shape, Color, Texture", "Principles: Balance, Rhythm, Unity", "Classification of Art (Visual, Performing, Literary)", "Elements and Principles of Design", "Perspective Drawing (Linear and Aerial)"],
            outcomes: "Apply art elements/principles. Analyze color theory."
        },
        { 
            id: "art_2", 
            topic: "Art History", 
            subtopics: ["Techniques: Shading, Perspective, Media", "Figure Drawing, Sculpture steps", "Traditional Nigerian Art (Nok, Ife, Benin, Igbo-Ukwu)", "Ancient Traditional Art of West Africa", "Contemporary Nigerian Artists and their Styles"],
            outcomes: "Produce realistic drawings (perspective/chiaroscuro). Execute sculpture creation."
        },
        { 
            id: "art_3", 
            topic: "Crafts and History", 
            subtopics: ["Crafts (Textile, Graphics)", "Nigerian Traditional Art (Nok, Ife, Benin)"],
            outcomes: "Apply design principles to crafts. Identify features of Nigerian art forms."
        },
        {
            id: "art_4", 
            topic: "Applied Arts and Crafts",
            subtopics: ["Graphics (Lettering, Posters, Logo Design)", "Textiles (Tie and Dye, Batik, Weaving)", "Ceramics and Pottery", "Sculpture (Modeling, Carving, Casting)"],
            outcomes: "Apply graphic design principles. Demonstrate techniques in textile and ceramic production."
        }
    ],
    "Yoruba": [
        { 
            id: "yor_1", 
            topic: "Ede - Language", 
            subtopics: ["Pronunciation, Tones (High, Low, Mid)", "Vowels, Consonants", "Aayan Ogbufo (Translation)", "Aroko (Narrative, Descriptive, Argumentative Composition)", "Isori Oro (Parts of Speech)", "Ihun Gbolohun (Sentence Structure)"],
            outcomes: "Produce sounds accurately. Apply tonal marks."
        },
        { 
            id: "yor_2", 
            topic: "Asa - Culture", 
            subtopics: ["Culture and Institutions", "Igbeyawo (Marriage)", "Oyun Nini ati Itoju Oyun (Pregnancy and Care)", "Igbagbo Yoruba nipa Olorun ati Orisa (Religious Beliefs)", "Eto Isinku ati Ogun Pinpin (Funeral and Inheritance)"],
            outcomes: "Describe core cultural practices."
        },
        { 
            id: "yor_3", 
            topic: "Literature", 
            subtopics: ["Oral Literature (Proverbs, Riddles)", "Written Literature"],
            outcomes: "Analyze oral literature forms."
        },
        {
            id: "yor_4", 
            topic: "Litireso (Literature)",
            subtopics: ["Itan Aroso (Prose)", "Ewi (Poetry - Oral and Written)", "Ere Onitan (Drama)", "Itupale Iwe (Literary Appreciation and Analysis)"],
            outcomes: "Communicate effectively in Yoruba. Analyze prescribed literary texts and explain cultural values."
        }
    ],
    "Igbo": [
        { 
            id: "igb_1", 
            topic: "Ede - Language", 
            subtopics: ["Pronunciation, Tones", "Vowels, Consonants", "Ntughari (Translation)", "Utọasụsụ (Grammar: Tenses, Pronouns, Prepositions)", "Edemede (Narrative, Descriptive, and Letter Writing)", "Nkeji Mkpụrụokwu (Syllabification)"],
            outcomes: "Produce sounds accurately. Apply tonal marks."
        },
        { 
            id: "igb_2", 
            topic: "Omenala - Culture", 
            subtopics: ["Culture and Institutions", "Alụmdi na Nwunye (Marriage)", "Ọmụmụ na Ibi Ugwu (Birth and Circumcision)", "Echichi (Chieftaincy Titles: Ozo, Eze)", "Ịkwa Ozu na Ike Ekpe (Funeral and Will)"],
            outcomes: "Describe core cultural practices."
        },
        { 
            id: "igb_3", 
            topic: "Literature", 
            subtopics: ["Oral Literature", "Written Literature"],
            outcomes: "Analyze oral literature forms."
        },
        {
            id: "igbo_4", 
            topic: "Agụmagụ (Literature)",
            subtopics: ["Agụmagụ Onu (Oral Literature: Myths, Legends, Proverbs)", "Agụmagụ Edere-ede (Written Prose, Poetry, and Drama)", "Atụmatụ Okwu (Figures of Speech)"],
            outcomes: "Write and speak Igbo fluently. Interpret cultural symbols and evaluate prescribed literary works."
        }
    ],
    "Hausa": [
        { 
            id: "hau_1", 
            topic: "Harshe - Language", 
            subtopics: ["Pronunciation, Tones", "Vowels, Consonants", "Fassara (Translation)", "Insha’i (Composition: Narrative, Descriptive, Dialogue)", "Nahawu (Grammar: Word Classes, Gender, Number)", "Tsarin Sauti (Sound System: Vowels and Consonants)"],
            outcomes: "Produce sounds accurately. Apply tonal marks."
        },
        { 
            id: "hau_2", 
            topic: "Al'adu - Culture", 
            subtopics: ["Culture and Institutions", "Rayuwar Dan-adam (Human Life Cycle)", "Sana'o'in Gargajiya (Traditional Occupations)", "Addini da Zaman Takewa (Religion and Social Interaction)", "Bukukuwan Gargajiya (Traditional Festivals)"],
            outcomes: "Describe core cultural practices."
        },
        { 
            id: "hau_3", 
            topic: "Literature", 
            subtopics: ["Oral Literature", "Written Literature"],
            outcomes: "Analyze oral literature forms."
        },
        {
            id: "hau_4", 
            topic: "Adabi (Literature)",
            subtopics: ["Adabin Baka (Oral Literature: Riddles, Tales, Songs)", "Rubutun Adabi (Written Prose, Poetry, and Drama)", "Tantance Adabi (Literary Appreciation)"],
            outcomes: "Apply Hausa grammar in writing. Demonstrate knowledge of traditional Hausa customs and literary forms."
        }
    ],
    "Data Processing": [
        { 
            id: "ict_1", 
            topic: "Computer Fundamentals", 
            subtopics: ["Hardware and Software Components", "Classification, Operating Systems", "History and Generations of Computers", "Data and Information Concepts", "The System Unit (CPU, Motherboard, Memory)", "Number Systems (Binary, Octal, Hexadecimal)"],
            outcomes: "Identify hardware functions. Differentiate system/application software."
        },
        { 
            id: "ict_2", 
            topic: "Application Software", 
            subtopics: ["Data Concept, Data Capture", "Validation, Files, Database Hierarchy", "Word Processing (Formatting, Editing, Printing)", "Spreadsheet (Formulas, Functions, Charts)", "Presentation Packages (Slide Layouts, Animations)", "Database Management Systems (Tables, Queries, Reports)"],
            outcomes: "Explain data hierarchy. Apply validation techniques."
        },
        {
            id: "dp_3",
            topic: "Information Tools",
            subtopics: ["Graphic Tools (CorelDraw, Photoshop basics)", "The Impact of ICT on Society (Privacy, Job Creation)"],
            outcomes: "Demonstrate use of graphic packages and discuss ICT impact."
        },
        { 
            id: "ict_3", 
            topic: "Networking and Internet", 
            subtopics: ["Network Concepts (LAN, WAN, Topologies)", "Application Software Skills (Word, Spreadsheet)"],
            outcomes: "Distinguish network topologies. Write spreadsheet formulas."
        },
        {
            id: "dp_4", 
            topic: "Networking and Computing Ethics",
            subtopics: ["The Internet and World Wide Web (Browsing, Email, Search Engines)", "Computer Networking (LAN, WAN, MAN)", "Cyber Security and Ethics", "Computer Maintenance and Safety Measures"],
            outcomes: "Perform basic data processing tasks. Identify networking types and apply cyber security safety rules."
        }
    ],
    "Civic Education": [
        { 
            id: "civ_1", 
            topic: "Values and Citizenship", 
            subtopics: ["Rights and Duties", "Responsibilities, Citizenship Education", "Societal Values (Justice, Selflessness, Integrity)", "Citizenship (Acquisition, Rights, and Duties)", "Nationalism and National Symbols", "Constitutional Development in Nigeria"],
            outcomes: "Define rights/duties. Explain responsible citizenship."
        },
        { 
            id: "civ_2", 
            topic: "Social Issues", 
            subtopics: ["Constitution, Rule of Law", "Fundamental Human Rights", "Cultism (Causes, Consequences, and Solutions)", "Drug and Substance Abuse (Types and Effects)", "Human Trafficking (Causes and Prevention)", "Youth Empowerment (Importance and Skills)"],
            outcomes: "Explain constitution features. Analyze Rule of Law application."
        },
        { 
            id: "civ_3", 
            topic: "Governance and Law", 
            subtopics: ["Arms of Government", "Social Issues (HIV/AIDS, Drug Abuse, Trafficking)", "The 1999 Constitution (Features and Importance)", "Political Parties and Pressure Groups"],
            outcomes: "Describe government structure. Discuss causes/prevention of social problems."
        },
        {
            id: "civ_4", 
            topic: "Democracy and Governance",
            subtopics: ["Representative Democracy and Rule of Law", "The Pillars of Democracy", "Civil Society and Popular Participation", "Human Rights and UDHR (Universal Declaration of Human Rights)"],
            outcomes: "Evaluate the role of the rule of law. Describe the importance of human rights and active civic participation."
        }
    ],
    "Fisheries": [
        { 
            id: "fish_1", 
            topic: "Introductory Fisheries", 
            subtopics: ["Importance, Types (Capture, Culture)", "Water Quality"],
            outcomes: "Analyze economic importance. Define aquaculture vs capture."
        },
        { 
            id: "fish_2", 
            topic: "Fish Culture", 
            subtopics: ["Pond Construction", "Pond Preparation and Management"],
            outcomes: "Describe pond construction procedures. Analyze water quality parameters."
        },
        { 
            id: "fish_3", 
            topic: "Biology and Harvesting", 
            subtopics: ["External/Internal Anatomy", "Fish Feeds", "Harvesting Gear and Processing"],
            outcomes: "Identify fish features. Classify feeds. Describe harvesting/preservation methods."
        }
    ],
    "Insurance": [
        { 
            id: "ins_1", 
            topic: "Introduction to Insurance", 
            subtopics: ["Definition, Purpose", "Risk Management", "History and Evolution of Insurance in Nigeria", "The Functions of Insurance", "Basic Principles (Utmost Good Faith, Insurable Interest, Indemnity, Proximate Cause)", "Proximate Cause, Contribution, and Subrogation"],
            outcomes: "Define insurance. Differentiate peril and hazard."
        },
        { 
            id: "ins_2", 
            topic: "Principles of Insurance", 
            subtopics: ["Utmost Good Faith, Insurable Interest", "Indemnity, Subrogation, Contribution"],
            outcomes: "Apply insurance principles to scenarios."
        },
        { 
            id: "ins_3", 
            topic: "Types and Practice", 
            subtopics: ["Life vs General Insurance", "Policy, Claims, Reinsurance"],
            outcomes: "Distinguish policy types. Explain claim settlement steps."
        },
        {
            id: "ins_4", 
            topic: "Classes of Insurance and Documentation",
            subtopics: ["Life Insurance (Whole Life, Endowment)", "General Insurance (Fire, Marine, Motor, Burglary)", "Insurance Documentation (Proposal Form, Policy, Cover Note)", "Claims Settlement Procedure"],
            outcomes: "Differentiate between life and general insurance. Describe the legal principles and documentation required in insurance."
        }
    ],
    "Marketing": [
        { 
            id: "mkt_1", 
            topic: "Introduction", 
            subtopics: ["Definition, Scope", "Evolution of Marketing Concept", "Marketing Environments (Macro and Micro)", "E-Marketing and Social Media Marketing"],
            outcomes: "Define marketing vs selling. Explain marketing philosophy."
        },
        { 
            id: "mkt_2", 
            topic: "Marketing Mix", 
            subtopics: ["Product (Branding, Packaging)", "Price, Place (Distribution), Promotion", "Product Life Cycle (Stages and Strategies)", "Pricing Methods (Skimming, Penetration, Psychological)", "Physical Distribution and Logistics Management"],
            outcomes: "Analyze branding role. Apply pricing strategies. Describe distribution channels."
        },
        { 
            id: "mkt_3", 
            topic: "Consumer Behavior", 
            subtopics: ["Buying Motives", "Market Segmentation"],
            outcomes: "Identify buying motives. Explain market segmentation."
        },
        {
            id: "mkt_4", 
            topic: "Market Research and Sales",
            subtopics: ["Marketing Research Process", "Sales Promotion and Advertising", "Personal Selling and Public Relations", "Consumerism and Consumer Rights"],
            outcomes: "Understand the stages of a product's life cycle. Explain how to conduct market research and execute sales promotions."
        }
    ],
    "Physical Education": [
        { 
            id: "phe_1", 
            topic: "The Human Body", 
            subtopics: ["Skeletal and Muscular Systems", "The Circulatory System (Blood and Heart Functions)", "The Respiratory System (Gas Exchange)", "First Aid"],
            outcomes: "Identify bones/muscles. Describe heart/lung function. Administer first aid."
        },
        { 
            id: "phe_2", 
            topic: "Sports and Games", 
            subtopics: ["History, Rules, and Skills (Football, Athletics, etc.)", "Ball Games (Handball, Basketball, Volleyball)", "Racket Games (Lawn Tennis, Table Tennis, Badminton)", "Aquatics (Swimming Strokes and Safety)", "Martial Arts and Traditional Sports"],
            outcomes: "Explain rules. Demonstrate proficiency in skills."
        },
        { 
            id: "phe_3", 
            topic: "Fitness and Management", 
            subtopics: ["Components of Fitness", "Organization of Competitions", "Physical Fitness Components (Agility, Power, Balance)", "Posture and Postural Defects", "Sports Nutrition and Drug Use in Sports (Doping)", "Intramural and Extramural Sports Competitions"],
            outcomes: "Define fitness components. Describe competition procedures."
        },
        {
            id: "phe_4", 
            topic: "Safety and Human Anatomy",
            subtopics: ["The Nervous and Endocrine Systems", "Excretory and Digestive Systems in Exercise", "Emergency Care and Safety Education", "Sports injuries (Types and Management)"],
            outcomes: "Identify postural defects. Explain the biological effects of exercise on the human body."
        }
    ],
    "Animal Husbandry (Vocational)": [
        {
            id: "anh_1", 
            topic: "Animal Nutrition and Health",
            subtopics: ["Feed and Feeding (Basal, Concentrates, Supplements)", "Pasture and Forage Management", "Disease Classification (Viral, Bacterial, Fungal)", "Parasite Control (Internal and External)"],
            outcomes: "Formulate livestock feed rations. Identify and treat common farm animal diseases."
        }
    ],
    "Fisheries (Vocational)": [
        {
            id: "fsh_1", 
            topic: "Pond Management and Processing",
            subtopics: ["Site Selection and Pond Construction", "Water Quality Management", "Fish Feed Formulation and Feeding", "Fish Processing and Processing and Preservation (Salting, Smoking, Freezing)"],
            outcomes: "Design a fish pond. Apply modern techniques for fish preservation and marketing."
        }
    ]
};
