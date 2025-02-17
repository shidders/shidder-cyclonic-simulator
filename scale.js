class Scale{
    constructor(/* basin, */data){
        // this.basin = basin instanceof Basin && basin;
        let opts;
        if(data && !(data instanceof LoadData)) opts = data;
        else opts = {};
        this.displayName = opts.displayName;
        this.measure = opts.measure || SCALE_MEASURE_ONE_MIN_KNOTS;   // 0 = 1-minute wind speed; 2 = pressure (10-minute wind speed not yet implemented)
        this.classifications = [];
        let cData;
        if(opts instanceof Array) cData = opts;
        else if(opts.classifications instanceof Array) cData = opts.classifications;
        if(cData){
            for(let c of cData){
                let clsn = {};
                clsn.threshold = c.threshold;
                if(clsn.threshold===undefined){
                    if(this.measure===SCALE_MEASURE_MILLIBARS) clsn.threshold = 1000;
                    else clsn.threshold = 35;
                }
                clsn.color = c.color===undefined ? 'white' : c.color;
                clsn.subtropicalColor = c.subtropicalColor;
                clsn.symbol = c.symbol===undefined ? 'C' : c.symbol;
                clsn.arms = c.arms===undefined ? 2 : c.arms;
                clsn.subtropicalSymbol = c.subtropicalSymbol;
                clsn.stormNom = c.stormNom;
                clsn.subtropicalStormNom = c.subtropicalStormNom;
                clsn.stat = c.stat;
                clsn.cName = c.cName;
                this.classifications.push(clsn);
            }
        }
        this.colorSchemeValue = 0;
        this.colorSchemeDisplayNames = opts.colorSchemeDisplayNames || [];
        this.flavorValue = 0;
        this.flavorDisplayNames = opts.flavorDisplayNames || [];
        // numbering/naming thresholds may be overridden by DesignationSystem
        this.numberingThreshold = opts.numberingThreshold===undefined ? 0 : opts.numberingThreshold;
        this.namingThreshold = opts.namingThreshold===undefined ? 1 : opts.namingThreshold;
        if(data instanceof LoadData) this.load(data);
    }

    get(stormData){
        if(stormData instanceof StormData){
            let m;
            let c = 0;
            if(this.measure===SCALE_MEASURE_MILLIBARS || this.measure===SCALE_MEASURE_INHG){    // pressure
                m = stormData.pressure;     // millibars by default
                if(this.measure===SCALE_MEASURE_INHG) m = mbToInHg(m);
                while(c+1<this.classifications.length && m<=this.classifications[c+1].threshold) c++;
            }else{                                                                              // wind speed
                m = stormData.windSpeed;    // 1-minute knots by default
                if(this.measure===SCALE_MEASURE_TEN_MIN_KNOTS || this.measure===SCALE_MEASURE_TEN_MIN_MPH || this.measure===SCALE_MEASURE_TEN_MIN_KMH) m = oneMinToTenMin(m);    // one-minute to ten-minute wind conversion
                if(this.measure===SCALE_MEASURE_ONE_MIN_MPH || this.measure===SCALE_MEASURE_TEN_MIN_MPH) m = ktsToMph(m);   // knots-to-mph conversion
                if(this.measure===SCALE_MEASURE_ONE_MIN_KMH || this.measure===SCALE_MEASURE_TEN_MIN_KMH) m = ktsToKmh(m);   // knots-to-km/h conversion
                while(c+1<this.classifications.length && m>=this.classifications[c+1].threshold) c++;
            }
            return c;
        }
    }

    getColor(){
        let c;
        let subtropical;
        if(arguments[0] instanceof StormData){
            if(arguments[0].type===EXTROP) return COLORS.storm[EXTROP];
            if(arguments[0].type===TROPWAVE) return COLORS.storm[TROPWAVE];
            c = this.get(arguments[0]);
            subtropical = arguments[0].type===SUBTROP;
        }else{
            c = arguments[0];
            subtropical = arguments[1];
        }
        if(this.classifications.length<1) return 'white';
        while(!this.classifications[c].color && c>0) c--;
        let clsn = this.classifications[c];
        let color;
        if(subtropical && clsn.subtropicalColor) color = clsn.subtropicalColor;
        else color = clsn.color;
        if(color instanceof Array) return color[this.colorSchemeValue];
        return color;
    }

    getIcon(){
        let c;
        let subtropical;
        let color;
        if(arguments[0] instanceof StormData){
            c = this.get(arguments[0]);
            subtropical = arguments[0].type===SUBTROP;
            color = this.getColor(arguments[0]);
        }else{
            c = arguments[0];
            subtropical = arguments[1];
            color = this.getColor(c,subtropical);
        }
        if(this.classifications.length<1) return {symbol: subtropical ? 'SC' : 'C', arms: 2, color: 'white'};
        while(!this.classifications[c].symbol && c>0) c--;
        let clsn = this.classifications[c];
        let symbol;
        let fetch = sym=>{
            if(sym instanceof Array) return sym[this.flavorValue];
            return sym;
        };
        if(subtropical){
            if(clsn.subtropicalSymbol) symbol = fetch(clsn.subtropicalSymbol);
            else symbol = 'S' + fetch(clsn.symbol);
        }else symbol = fetch(clsn.symbol);
        let arms = clsn.arms;
        return {symbol, arms, color};
    }

    getStormNom(){
        let c;
        let subtropical;
        if(arguments[0] instanceof StormData){
            c = this.get(arguments[0]);
            subtropical = arguments[0].type===SUBTROP;
        }else{
            c = arguments[0];
            subtropical = arguments[1];
        }
        if(this.classifications.length<1) return subtropical ? 'Subtropical Cyclone' : 'Tropical Cyclone';
        while(!this.classifications[c].stormNom && c>0) c--;
        let clsn = this.classifications[c];
        let fetch = n=>{
            if(n instanceof Array) return n[this.flavorValue];
            return n;
        };
        if(subtropical){
            if(clsn.subtropicalStormNom) return fetch(clsn.subtropicalStormNom);
            if(clsn.stormNom) return 'Subtropical ' + fetch(clsn.stormNom);
            return 'Subtropical Cyclone';
        }
        if(clsn.stormNom) return fetch(clsn.stormNom);
        return 'Tropical Cyclone';
    }

    getClassificationName(){
        let c;
        if(arguments[0] instanceof StormData) c = this.get(arguments[0]);
        else c = arguments[0];
        if(this.classifications.length<1) return 'Cyclone';
        if(this.classifications[c].cName) return this.classifications[c].cName;
        return c + '';
    }

    *statDisplay(){
        for(let i=0;i<this.classifications.length;i++){
            let clsn = this.classifications[i];
            if(clsn.stat){
                if(clsn.stat instanceof Array && clsn.stat[this.flavorValue]) yield {statName: clsn.stat[this.flavorValue], cNumber: i};
                else if(typeof clsn.stat === 'string') yield {statName: clsn.stat, cNumber: i};
            }
        }
    }

    colorScheme(v){
        if(typeof v === 'number'){
            this.colorSchemeValue = v;
            return this;
        }
        return this.colorSchemeValue;
    }

    flavor(v){
        if(typeof v === 'number'){
            this.flavorValue = v;
            return this;
        }
        return this.flavorValue;
    }

    clone(){
        let newScale = new Scale();
        for(let p of [
            'displayName',
            'measure',
            'colorSchemeValue',
            'flavorValue',
            'numberingThreshold',
            'namingThreshold'
        ]) newScale[p] = this[p];
        for(let p of [
            'classifications',
            'colorSchemeDisplayNames',
            'flavorDisplayNames'
        ]) newScale[p] = JSON.parse(JSON.stringify(this[p]));
        return newScale;
    }

    save(){
        let d = {};
        for(let p of [
            'displayName',
            'measure',
            'classifications',
            'colorSchemeValue',
            'colorSchemeDisplayNames',
            'flavorValue',
            'flavorDisplayNames',
            'numberingThreshold',
            'namingThreshold'
        ]) d[p] = this[p];
        return d;
    }

    load(data){
        if(data instanceof LoadData){
            let d = data.value;
            for(let p of [
                'displayName',
                'measure',
                'classifications',
                'colorSchemeValue',
                'colorSchemeDisplayNames',
                'flavorValue',
                'flavorDisplayNames'
            ]) this[p] = d[p];
            if(d.numberingThreshold!==undefined) this.numberingThreshold = d.numberingThreshold;
            if(d.namingThreshold!==undefined) this.namingThreshold = d.namingThreshold;
        }
    }

    static convertOldValue(v){  // converts pre-v0.2 (extended) Saffir-Simpson values to Scale.extendedSaffirSimpson values
        if(v<5) return v+1;
        return v+2;
    }
}

Scale.saffirSimpson = new Scale({
    displayName: 'Saffir-Simpson',
    colorSchemeDisplayNames: ['Classic','Wiki'],
    flavorDisplayNames: ['Hurricane','Typhoon','Cyclone'],
    classifications: [
        {
            threshold: 0,
            color: ['rgb(20,20,230)','#5ebaff'],
            subtropicalColor: ['rgb(60,60,220)','#5ebaff'],
            symbol: 'D',
            arms: 0,
            stormNom: 'Tropical Depression',
            subtropicalStormNom: 'Subtropical Depression',
            stat: 'Depressions',
            cName: 'Depression'
        },
        {
            threshold: 34,
            color: ['rgb(20,230,20)','#00faf4'],
            subtropicalColor: ['rgb(60,220,60)','#00faf4'],
            symbol: 'S',
            stormNom: 'Tropical Storm',
            subtropicalStormNom: 'Subtropical Storm',
            stat: 'Named Storms',
            cName: 'Storm'
        },
        {
            threshold: 64,
            color: ['rgb(230,230,20)','#ffffcc'],
            symbol: '1',
            stormNom: ['Hurricane','Typhoon','Cyclone'],
            stat: ['Hurricanes','Typhoons','Cyclones'],
            cName: 'Category 1'
        },
        {
            threshold: 83,
            color: ['rgb(240,170,20)','#ffe775'],
            symbol: '2',
            cName: 'Category 2'
        },
        {
            threshold: 96,
            color: ['rgb(240,20,20)','#ffc140'],
            symbol: '3',
            stormNom: ['Major Hurricane','Typhoon','Cyclone'],
            stat: ['Major Hurricanes','Category 3+','Category 3+'],
            cName: 'Category 3'
        },
        {
            threshold: 113,
            color: ['rgb(250,40,250)','#ff8f20'],
            symbol: '4',
            cName: 'Category 4'
        },
        {
            threshold: 130,
            color: ['rgb(250,40,250)','#ff8f20'],
            symbol: '4',
            stormNom: ['Major Hurricane','Super Typhoon','Cyclone'],
            stat: [undefined,'Super Typhoons'],
            cName: 'Category 4 STY'
        },
        {
            threshold: 137,
            color: ['rgb(250,140,250)','#ff6060'],
            symbol: '5',
            stat: 'Category 5s',
            cName: 'Category 5'
        }
    ]
});

Scale.extendedSaffirSimpson = new Scale({
    displayName: 'Extended Saffir-Simpson',
    colorSchemeDisplayNames: ['Classic','Wiki'],
    flavorDisplayNames: ['Hurricane','Typhoon','Cyclone'],
    classifications: [
        {
            threshold: 0,
            color: ['rgb(20,20,230)','#5ebaff'],
            subtropicalColor: ['rgb(60,60,220)','#5ebaff'],
            symbol: 'D',
            arms: 0,
            stormNom: 'Tropical Depression',
            subtropicalStormNom: 'Subtropical Depression',
            stat: 'Depressions',
            cName: 'Depression'
        },
        {
            threshold: 34,
            color: ['rgb(20,230,20)','#00faf4'],
            subtropicalColor: ['rgb(60,220,60)','#00faf4'],
            symbol: 'S',
            stormNom: 'Tropical Storm',
            subtropicalStormNom: 'Subtropical Storm',
            stat: 'Named Storms',
            cName: 'Storm'
        },
        {
            threshold: 64,
            color: ['rgb(230,230,20)','#ffffcc'],
            symbol: '1',
            stormNom: ['Hurricane','Typhoon','Cyclone'],
            stat: ['Hurricanes','Typhoons','Cyclones'],
            cName: 'Category 1'
        },
        {
            threshold: 83,
            color: ['rgb(240,170,20)','#ffe775'],
            symbol: '2',
            cName: 'Category 2'
        },
        {
            threshold: 96,
            color: ['rgb(240,20,20)','#ffc140'],
            symbol: '3',
            stormNom: ['Major Hurricane','Typhoon','Cyclone'],
            stat: ['Major Hurricanes','Category 3+','Category 3+'],
            cName: 'Category 3'
        },
        {
            threshold: 113,
            color: ['rgb(250,40,250)','#ff8f20'],
            symbol: '4',
            cName: 'Category 4'
        },
        {
            threshold: 130,
            color: ['rgb(250,40,250)','#ff8f20'],
            symbol: '4',
            stormNom: ['Major Hurricane','Super Typhoon','Cyclone'],
            stat: [undefined,'Super Typhoons'],
            cName: 'Category 4 STY'
        },
        {
            threshold: 137,
            color: ['rgb(250,140,250)','#ff6060'],
            symbol: '5',
            stat: 'Category 5+',
            cName: 'Category 5'
        },
        {
            threshold: 165,
            color: ['rgb(250,200,250)','#8b0000'],
            symbol: '6',
            cName: 'Category 6'
        },
        {
            threshold: 198,
            color: ['rgb(240,90,90)','#cc0033'],
            symbol: '7',
            cName: 'Category 7'
        },
        {
            threshold: 255,
            color: ['rgb(190,60,60)','#cc0066'],
            symbol: '8',
            stat: 'Category 8+',
            cName: 'Category 8'
        },
        {
            threshold: 318,
            color: ['rgb(130,10,10)','#9B30FF'],
            symbol: '9',
            cName: 'Category 9'
        },
        {
            threshold: 378,
            color: ['rgb(120,10,120)','#F9A7B0'],
            symbol: '10',
            cName: 'Category 10'
        },
        {
            threshold: 434,
            color: ['rgb(20,0,140)','#ff99ff'],
            symbol: 'HY',
            stormNom: ['Hypercane','Hyperphoon','Hyperclone'],
            stat: ['Hypercanes','Hyperphoons','Hyperclones'],
            cName: 'Hypercane'
        },
        {
            threshold: 657,
            color: ['rgb(54,54,54)','#363636'],
            symbol: 'BH',
            arms: 4,
            stormNom: 'Black Hole',
            stat: 'Black Holes',
            cName: 'Black Hole'
        },
        {
            threshold: 1002,
            color: ['rgb(27,27,27)','#1b1b1b'],
            symbol: 'SBH',
            arms: 4,
            stormNom: 'Supermassive Black Hole',
            cName: 'Supermassive Black Hole'
        },
        {
            threshold: 2004,
            color: ['rgb(0,0,0)','#000000'],
            symbol: 'UBH',
            arms: 4,
            stormNom: 'Ultramassive Black Hole',
            cName: 'Ultramassive Black Hole'
        },
        {
            threshold: 4008,
            color: ['rgb(125,249,255)','#7DF9FF'],
            symbol: 'Q',
            arms: 6,
            stormNom: 'Quasar',
            stat: 'Quasars',
            cName: 'Quasar'
        },
        {
            threshold: 8016,
            color: ['rgb(180,252,255)','#B4FCFF'],
            symbol: 'B',
            arms: 6,
            stormNom: 'Blazar',
            cName: 'Blazar'
        },
        {
            threshold: 16032,
            color: ['rgb(123,63,0)','#7B3F00'],
            symbol: 'SHIT',
            arms: 8,
            stormNom: 'Shitticane',
            cName: 'Shitticane'
        },
        {
            threshold: 32064,
            color: ['rgb(62,34,0)','#3E2200'],
            symbol: 'SHART',
            arms: 10,
            stormNom: 'Sharticane',
            stat: 'Sharts',
            cName: 'Sharticane'
        }
    ]
});

Scale.australian = new Scale({
    measure: SCALE_MEASURE_TEN_MIN_KNOTS,
    displayName: 'Australian',
    colorSchemeDisplayNames: ['Classic','Wiki'],
    flavorDisplayNames: ['Cyclone'],
    classifications: [
        {
            threshold: 0,
            color: ['rgb(20,20,230)','#5ebaff'],
            subtropicalColor: ['rgb(60,60,220)','#5ebaff'],
            symbol: 'D',
            arms: 0,
            stormNom: 'Tropical Depression',
            subtropicalStormNom: 'Subtropical Depression',
            stat: 'Depressions',
            cName: 'Depression'
        },
        {
            threshold: 34,
            color: ['rgb(20,230,20)','#00faf4'],
            subtropicalColor: ['rgb(60,220,60)','#00faf4'],
            symbol: '1',
            stormNom: 'Tropical Cyclone',
            subtropicalStormNom: 'Subtropical Cyclone',
            stat: 'Cyclones',
            cName: 'Category 1'
        },
        {
            threshold: 48,
            color: ['rgb(180,230,20)','#ccffff'],
            subtropicalColor: ['rgb(180,220,85)','#ccffff'],
            symbol: '2',
            stat: 'Category 2+',
            cName: 'Category 2'
        },
        {
            threshold: 64,
            color: ['rgb(230,230,20)','#ffffcc'],
            symbol: '3',
            stat: 'Category 3+',
            cName: 'Category 3'
        },
        {
            threshold: 86,
            color: ['rgb(240,20,20)','#ffc140'],
            symbol: '4',
            stat: 'Category 4+',
            cName: 'Category 4'
        },
        {
            threshold: 110,
            color: ['rgb(250,140,250)','#ff6060'],
            symbol: '5',
            stat: 'Category 5s',
            cName: 'Category 5'
        }
    ]
});

Scale.typhoonCommittee = new Scale({
    measure: SCALE_MEASURE_TEN_MIN_KNOTS,
    displayName: 'WMO Typhoon Committee',
    colorSchemeDisplayNames: ['Classic','Wiki'],
    flavorDisplayNames: ['Typhoon'],
    classifications: [
        {
            threshold: 0,
            color: ['rgb(20,20,230)','#5ebaff'],
            subtropicalColor: ['rgb(60,60,220)','#5ebaff'],
            symbol: 'D',
            arms: 0,
            stormNom: 'Tropical Depression',
            subtropicalStormNom: 'Subtropical Depression',
            stat: 'Depressions',
            cName: 'Depression'
        },
        {
            threshold: 34,
            color: ['rgb(20,230,20)','#00faf4'],
            subtropicalColor: ['rgb(60,220,60)','#00faf4'],
            symbol: 'S',
            stormNom: 'Tropical Storm',
            subtropicalStormNom: 'Subtropical Storm',
            stat: 'Named Storms',
            cName: 'Storm'
        },
        {
            threshold: 48,
            color: ['rgb(180,230,20)','#ccffff'],
            subtropicalColor: ['rgb(180,220,85)','#ccffff'],
            symbol: 'STS',
            subtropicalSymbol: 'SSS',
            stormNom: 'Severe Tropical Storm',
            subtropicalStormNom: 'Severe Subtropical Storm',
            stat: 'Severe',
            cName: 'Severe'
        },
        {
            threshold: 64,
            color: ['rgb(240,130,20)','#fdaf9a'],
            symbol: 'TY',
            stormNom: 'Typhoon',
            stat: 'Typhoons',
            cName: 'Typhoon'
        },
        {
            threshold: 132,
            color: ['rgb(255,89,89)','#ff5959'],
            symbol: 'STY',
            stormNom: 'Super Typhoon',
            stat: 'Super Typhoons',
            cName: 'Super'
        }
    ]
});

Scale.IMD = new Scale({
    measure: SCALE_MEASURE_TEN_MIN_KNOTS,   // technically should be 3-minute, but I didn't bother making a conversion for that
    displayName: 'India Meteorological Dept.',
    colorSchemeDisplayNames: ['Classic','Wiki'],
    flavorDisplayNames: ['Cyclone'],
    namingThreshold: 2,
    classifications: [
        {
            threshold: 17,
            color: ['rgb(75,75,245)','#80ccff'],
            subtropicalColor: ['rgb(95,95,235)','#80ccff'],
            symbol: 'D',
            arms: 0,
            stormNom: 'Depression',
            stat: 'Depressions',
            cName: 'Depression'
        },
        {
            threshold: 28,
            color: ['rgb(20,20,230)','#5ebaff'],
            subtropicalColor: ['rgb(60,60,220)','#5ebaff'],
            symbol: 'DD',
            arms: 0,
            stormNom: 'Deep Depression',
            stat: 'Deep Depressions',
            cName: 'Deep Depression'
        },
        {
            threshold: 34,
            color: ['rgb(20,230,20)','#00faf4'],
            subtropicalColor: ['rgb(60,220,60)','#00faf4'],
            symbol: 'CS',
            subtropicalSymbol: 'SS',
            stormNom: 'Cyclonic Storm',
            stat: 'Cyclonic Storms',
            cName: 'Cyclonic Storm'
        },
        {
            threshold: 48,
            color: ['rgb(180,230,20)','#ccffff'],
            subtropicalColor: ['rgb(180,220,85)','#ccffff'],
            symbol: 'SCS',
            subtropicalSymbol: 'SSS',
            stormNom: 'Severe Cyclonic Storm',
            stat: 'Severe',
            cName: 'Severe Cyclonic Storm'
        },
        {
            threshold: 64,
            color: ['rgb(230,230,20)','#ffffcc'],
            symbol: 'VSCS',
            subtropicalSymbol: 'VSSS',
            stormNom: 'Very Severe Cyclonic Storm',
            stat: 'Very Severe',
            cName: 'Very Severe Cyclonic Storm'
        },
        {
            threshold: 90,
            color: ['rgb(240,20,20)','#ffc140'],
            symbol: 'ESCS',
            subtropicalSymbol: 'ESSS',
            stormNom: 'Extremely Severe Cyclonic Storm',
            stat: 'Extremely Severe',
            cName: 'Extremely Severe Cyclonic Storm'
        },
        {
            threshold: 120,
            color: ['rgb(250,140,250)','#ff6060'],
            symbol: 'SUCS',
            subtropicalSymbol: 'SUSS',
            stormNom: 'Super Cyclonic Storm',
            stat: 'Super',
            cName: 'Super Cyclonic Storm'
        }
    ]
});

Scale.southwestIndianOcean = new Scale({
    measure: SCALE_MEASURE_TEN_MIN_KNOTS,
    displayName: 'Southwest Indian Ocean',
    colorSchemeDisplayNames: ['Classic','Wiki'],
    flavorDisplayNames: ['Cyclone'],
    namingThreshold: 2,
    classifications: [
        {
            threshold: 0,
            color: ['rgb(75,75,245)','#80ccff'],
            subtropicalColor: ['rgb(95,95,235)','#80ccff'],
            symbol: 'Di',
            arms: 0,
            stormNom: 'Tropical Disturbance',
            subtropicalStormNom: 'Subtropical Disturbance',
            stat: 'Disturbances',
            cName: 'Disturbance'
        },
        {
            threshold: 28,
            color: ['rgb(20,20,230)','#5ebaff'],
            subtropicalColor: ['rgb(60,60,220)','#5ebaff'],
            symbol: 'D',
            arms: 0,
            stormNom: 'Tropical Depression',
            stat: 'Depressions',
            cName: 'Depression'
        },
        {
            threshold: 34,
            color: ['rgb(20,230,20)','#00faf4'],
            subtropicalColor: ['rgb(60,220,60)','#00faf4'],
            symbol: 'MTS',
            subtropicalSymbol: 'MSS',
            stormNom: 'Moderate Tropical Storm',
            subtropicalStormNom: 'Moderate Subtropical Storm',
            stat: 'Named Storms',
            cName: 'Moderate Tropical Storm'
        },
        {
            threshold: 48,
            color: ['rgb(180,230,20)','#ccffff'],
            subtropicalColor: ['rgb(180,220,85)','#ccffff'],
            symbol: 'STS',
            subtropicalSymbol: 'SSS',
            stormNom: 'Severe Tropical Storm',
            subtropicalStormNom: 'Severe Subtropical Storm',
            stat: 'Severe',
            cName: 'Severe Tropical Storm'
        },
        {
            threshold: 64,
            color: ['rgb(230,230,20)','#ffffcc'],
            symbol: 'TC',
            subtropicalSymbol: 'SC',
            stormNom: 'Tropical Cyclone',
            subtropicalStormNom: 'Subtropical Cyclone',
            stat: 'Cyclones',
            cName: 'Tropical Cyclone'
        },
        {
            threshold: 90,
            color: ['rgb(240,20,20)','#ffc140'],
            symbol: 'ITC',
            subtropicalSymbol: 'ISC',
            stormNom: 'Intense Tropical Cyclone',
            subtropicalStormNom: 'Intense Subtropical Cyclone',
            stat: 'Intense',
            cName: 'Intense Tropical Cyclone'
        },
        {
            threshold: 115,
            color: ['rgb(250,140,250)','#ff6060'],
            symbol: 'VITC',
            subtropicalSymbol: 'VISC',
            stormNom: 'Very Intense Tropical Cyclone',
            subtropicalStormNom: 'Very Intense Subtropical Cyclone',
            stat: 'Very Intense',
            cName: 'Very Intense Tropical Cyclone'
        }
    ]
});
Scale.medicane = new Scale({
    measure: SCALE_MEASURE_ONE_MIN_KMH,
    displayName: 'Medicane',
    colorSchemeDisplayNames: ['Classic'],
    flavorDisplayNames: ['Cyclone'],
    namingThreshold: 2,
    classifications: [
        {
            threshold: 38,
            color: ['rgb(54,141,255)','#368dff'],
            subtropicalColor: ['rgb(112,81,237)','#7051ed'],
            symbol: 'MD',
            arms: 0,
            stormNom: 'Tropical Medipression',
            subtropicalStormNom: 'Subtropical Medipression',
            stat: 'Medipressions',
            cName: 'Medipression'
        },
        {
            threshold: 60,
            color: ['rgb(79,255,202)','#4fffca'],
            subtropicalColor: ['rgb(138,255,210)','#8affd2'],
            symbol: 'MS',
            stormNom: 'Tropical Medistorm',
            subtropicalStormNom: 'Subtropical Medistorm',
            stat: 'Medistorms',
            cName: 'Medistorm',
        },
        {
            threshold: 98,
            color: ['rgb(175,255,84)','#afff54'],
            symbol: 'MC',
            stormNom: 'Medicane',
            stat: 'Medicanes',
            cName: 'Medicane',
        },
        {
            threshold: 158,
            color: ['rgb(255,190,87)','#ffbe57'],
            symbol: 'MMC',
            stormNom: 'Major Medicane',
            stat: 'Major Medicanes',
            cName: 'Major Medicane',
        }
    ]
});
Scale.southwestIndianOcean = new Scale({
    measure: SCALE_MEASURE_ONE_MIN_MPH,
    displayName: 'Southwest Indian Ocean',
    colorSchemeDisplayNames: ['Classic','Wiki'],
    flavorDisplayNames: ['Cyclone'],
    namingThreshold: 2,
    classifications: [
        {
            threshold: 0,
            color: ['rgb(75,75,245)','#80ccff'],
            subtropicalColor: ['rgb(95,95,235)','#80ccff'],
            symbol: 'Di',
            arms: 0,
            stormNom: 'Tropical Disturbance',
            subtropicalStormNom: 'Subtropical Disturbance',
            stat: 'Disturbances',
            cName: 'Disturbance'
        },
        {
            threshold: 28,
            color: ['rgb(20,20,230)','#5ebaff'],
            subtropicalColor: ['rgb(60,60,220)','#5ebaff'],
            symbol: 'D',
            arms: 0,
            stormNom: 'Tropical Depression',
            stat: 'Depressions',
            cName: 'Depression'
        },
        {
            threshold: 34,
            color: ['rgb(20,230,20)','#00faf4'],
            subtropicalColor: ['rgb(60,220,60)','#00faf4'],
            symbol: 'MTS',
            subtropicalSymbol: 'MSS',
            stormNom: 'Moderate Tropical Storm',
            subtropicalStormNom: 'Moderate Subtropical Storm',
            stat: 'Named Storms',
            cName: 'Moderate Tropical Storm'
        },
        {
            threshold: 48,
            color: ['rgb(180,230,20)','#ccffff'],
            subtropicalColor: ['rgb(180,220,85)','#ccffff'],
            symbol: 'STS',
            subtropicalSymbol: 'SSS',
            stormNom: 'Severe Tropical Storm',
            subtropicalStormNom: 'Severe Subtropical Storm',
            stat: 'Severe',
            cName: 'Severe Tropical Storm'
        },
        {
            threshold: 64,
            color: ['rgb(230,230,20)','#ffffcc'],
            symbol: 'TC',
            subtropicalSymbol: 'SC',
            stormNom: 'Tropical Cyclone',
            subtropicalStormNom: 'Subtropical Cyclone',
            stat: 'Cyclones',
            cName: 'Tropical Cyclone'
        },
        {
            threshold: 90,
            color: ['rgb(240,20,20)','#ffc140'],
            symbol: 'ITC',
            subtropicalSymbol: 'ISC',
            stormNom: 'Intense Tropical Cyclone',
            subtropicalStormNom: 'Intense Subtropical Cyclone',
            stat: 'Intense',
            cName: 'Intense Tropical Cyclone'
        },
        {
            threshold: 115,
            color: ['rgb(250,140,250)','#ff6060'],
            symbol: 'VITC',
            subtropicalSymbol: 'VISC',
            stormNom: 'Very Intense Tropical Cyclone',
            subtropicalStormNom: 'Very Intense Subtropical Cyclone',
            stat: 'Very Intense',
            cName: 'Very Intense Tropical Cyclone'
        }
    ]
});
Scale.custom = new Scale({
    measure: SCALE_MEASURE_TEN_MIN_KNOTS,
    displayName: 'F13',
    colorSchemeDisplayNames: ['Classic'],
    flavorDisplayNames: ['Hurricane'],
    namingThreshold: 2,
    classifications: [
        {
            threshold: 17,
            color: ['rgb(117,255,250)','#75fffa'],
            subtropicalColor: ['rgb(215,191,255)','#d7bfff'],
            symbol: 'I',
            arms: 1,
            stormNom: 'Invest',
            subtropicalStormNom: 'Subtropical Invest',
            stat: 'Invests',
            cName: 'Invest'
        },
        {
            threshold: 25,
            color: ['rgb(48,159,255)','#309fff'],
            subtropicalColor: ['rgb(117,48,255)','#7530ff'],
            symbol: 'D',
            stormNom: 'Depression',
            subtropicalStormNom: 'Subtropical Depression',
            stat: 'Depressions',
            cName: 'Depression',
        },
        {
            threshold: 35,
            color: ['rgb(48,255,51)','#30ff33'],
            symbol: 'S',
            stormNom: 'Tropical Storm',
            stat: 'Tropical Storms',
            cName: 'Tropical Storm',
        },
        {
            threshold: 55,
            color: ['rgb(168, 240, 34)','#a8f022'],
            symbol: 'S',
            stormNom: 'Tropical Storm',
            cName: 'Tropical Storm',
        },
        {
            threshold: 65,
            color: ['rgb(244,247,45)','#fafc47'],
            symbol: '1',
            stormNom: 'Hurricane',
            stat: 'C1s',
            cName: 'Hurricane',
        },
        {
            threshold: 85,
            color: ['rgb(240,206,34)','#f0ce22'],
            symbol: '2',
            stormNom: 'Hurricane',
            stat: 'C2s',
            cName: 'Hurricane',
        },
        {
            threshold: 100,
            color: ['rgb(242,146,36)','#f29224'],
            symbol: '3',
            stormNom: 'Major Hurricane',
            stat: 'C3s',
            cName: 'Major Hurricane',
        },
        {
            threshold: 115,
            color: ['rgb(227,86,25)','#e35619'],
            symbol: '4',
            stormNom: 'Major Hurricane',
            stat: 'C4s',
            cName: 'Major Hurricane',
        },
        {
            threshold: 130,
            color: ['rgb(227,42,25)','#e32a19'],
            symbol: '4',
            stormNom: 'Major Hurricane',
            stat: 'C4s',
            cName: 'Major Hurricane',
        },
        {
            threshold: 140,
            color: ['rgb(227,25,52)','#e31934'],
            symbol: '5',
            stormNom: 'Super Hurricane',
            stat: 'C5s',
            cName: 'Super Hurricane',
        },
        {
            threshold: 160,
            color: ['rgb(247,82,104)','#f75268'],
            symbol: '5',
            stormNom: 'Super Hurricane',
            cName: 'Super Hurricane',
        },
        { 
            threshold: 180,
            color: ['rgb(247,82,104)','#f75268'],
            symbol: '5',
            stormNom: 'Super Hurricane',
            cName: 'Super Hurricane',
        },
        { 
            threshold: 200,
            color: ['rgb(255,245,246)','#fff5f6'],
            symbol: '5',
            stormNom: 'Hypercane',
            stat: 'Hypercanes',
            cName: 'Hypercane',
         }
    ]
 });
Scale.presetScales = [
    Scale.saffirSimpson,
    Scale.extendedSaffirSimpson,
    Scale.australian,
    Scale.typhoonCommittee,
    Scale.IMD,
    Scale.southwestIndianOcean,
    Scale.medicane,
    Scale.custom
];
