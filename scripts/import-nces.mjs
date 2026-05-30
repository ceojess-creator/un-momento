// scripts/import-nces.mjs
import { createClient } from '@supabase/supabase-js';
import https from 'https';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BATCH_SIZE   = 250;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON: ' + data.slice(0,100))); }
      });
    }).on('error', reject);
  });
}

async function upsertBatch(batch) {
  const { error } = await supabase
    .from('schools')
    .upsert(batch, { onConflict: 'nces_id', ignoreDuplicates: true });
  if (error) console.error('  Batch error:', error.message);
  return !error;
}

async function importPrioritySchools() {
  console.log('\n✏️  Inserting priority schools...');

  const schools = [
    // Orange County CA
    { nces_id:'manual-mater-dei',           name:'Mater Dei High School',               type:'high_school', city:'Santa Ana',              state_abbr:'CA', zip:'92707', county:'Orange County',      district_name:'' },
    { nces_id:'manual-santa-margarita',     name:'Santa Margarita Catholic High School', type:'high_school', city:'Rancho Santa Margarita', state_abbr:'CA', zip:'92688', county:'Orange County',      district_name:'' },
    { nces_id:'manual-servite',             name:'Servite High School',                  type:'high_school', city:'Anaheim',                state_abbr:'CA', zip:'92801', county:'Orange County',      district_name:'' },
    { nces_id:'manual-orange-lutheran',     name:'Orange Lutheran High School',          type:'high_school', city:'Orange',                 state_abbr:'CA', zip:'92869', county:'Orange County',      district_name:'' },
    { nces_id:'manual-crean-lutheran',      name:'Crean Lutheran High School',           type:'high_school', city:'Irvine',                 state_abbr:'CA', zip:'92618', county:'Orange County',      district_name:'' },
    { nces_id:'manual-irvine-hs',           name:'Irvine High School',                   type:'high_school', city:'Irvine',                 state_abbr:'CA', zip:'92604', county:'Orange County',      district_name:'Irvine Unified' },
    { nces_id:'manual-woodbridge-hs',       name:'Woodbridge High School',               type:'high_school', city:'Irvine',                 state_abbr:'CA', zip:'92620', county:'Orange County',      district_name:'Irvine Unified' },
    { nces_id:'manual-university-hs',       name:'University High School Irvine',        type:'high_school', city:'Irvine',                 state_abbr:'CA', zip:'92612', county:'Orange County',      district_name:'Irvine Unified' },
    { nces_id:'manual-dana-hills',          name:'Dana Hills High School',               type:'high_school', city:'Dana Point',             state_abbr:'CA', zip:'92629', county:'Orange County',      district_name:'Capistrano Unified' },
    { nces_id:'manual-san-clemente-hs',     name:'San Clemente High School',             type:'high_school', city:'San Clemente',           state_abbr:'CA', zip:'92672', county:'Orange County',      district_name:'Capistrano Unified' },
    { nces_id:'manual-mission-viejo',       name:'Mission Viejo High School',            type:'high_school', city:'Mission Viejo',          state_abbr:'CA', zip:'92692', county:'Orange County',      district_name:'Saddleback Valley Unified' },
    { nces_id:'manual-aliso-niguel',        name:'Aliso Niguel High School',             type:'high_school', city:'Aliso Viejo',            state_abbr:'CA', zip:'92656', county:'Orange County',      district_name:'Capistrano Unified' },
    // LA County
    { nces_id:'manual-viewpoint',           name:'Viewpoint School',                     type:'high_school', city:'Calabasas',              state_abbr:'CA', zip:'91302', county:'Los Angeles County',  district_name:'' },
    { nces_id:'manual-harvard-westlake',    name:'Harvard-Westlake School',              type:'high_school', city:'Studio City',            state_abbr:'CA', zip:'91604', county:'Los Angeles County',  district_name:'' },
    { nces_id:'manual-loyola-la',           name:'Loyola High School',                   type:'high_school', city:'Los Angeles',            state_abbr:'CA', zip:'90015', county:'Los Angeles County',  district_name:'' },
    // Wisconsin
    { nces_id:'manual-homestead-hs',        name:'Homestead High School',                type:'high_school', city:'Mequon',                 state_abbr:'WI', zip:'53092', county:'Ozaukee County',     district_name:'Mequon-Thiensville' },
    { nces_id:'manual-nicolet-hs',          name:'Nicolet High School',                  type:'high_school', city:'Glendale',               state_abbr:'WI', zip:'53217', county:'Milwaukee County',   district_name:'Nicolet Union HSD' },
    { nces_id:'manual-whitefish-bay',       name:'Whitefish Bay High School',            type:'high_school', city:'Whitefish Bay',          state_abbr:'WI', zip:'53217', county:'Milwaukee County',   district_name:'Whitefish Bay SD' },
    { nces_id:'manual-brookfield-east',     name:'Brookfield East High School',          type:'high_school', city:'Brookfield',             state_abbr:'WI', zip:'53005', county:'Waukesha County',    district_name:'Elmbrook SD' },
    // Arizona
    { nces_id:'manual-hamilton-hs',         name:'Hamilton High School',                 type:'high_school', city:'Chandler',               state_abbr:'AZ', zip:'85226', county:'Maricopa County',    district_name:'Chandler Unified' },
    { nces_id:'manual-desert-vista',        name:'Desert Vista High School',             type:'high_school', city:'Phoenix',                state_abbr:'AZ', zip:'85048', county:'Maricopa County',    district_name:'Tempe Union HSD' },
    { nces_id:'manual-saguaro-hs',          name:'Saguaro High School',                  type:'high_school', city:'Scottsdale',             state_abbr:'AZ', zip:'85254', county:'Maricopa County',    district_name:'Scottsdale Unified' },
    { nces_id:'manual-brophy-prep',         name:'Brophy College Preparatory',           type:'high_school', city:'Phoenix',                state_abbr:'AZ', zip:'85012', county:'Maricopa County',    district_name:'' },
    // National top schools
    { nces_id:'manual-stuyvesant',          name:'Stuyvesant High School',               type:'high_school', city:'New York',               state_abbr:'NY', zip:'10007', county:'New York County',    district_name:'NYC DOE' },
    { nces_id:'manual-bronx-science',       name:'Bronx High School of Science',         type:'high_school', city:'Bronx',                  state_abbr:'NY', zip:'10468', county:'Bronx County',       district_name:'NYC DOE' },
    { nces_id:'manual-highland-park-tx',    name:'Highland Park High School',            type:'high_school', city:'Dallas',                 state_abbr:'TX', zip:'75205', county:'Dallas County',      district_name:'Highland Park ISD' },
    { nces_id:'manual-new-trier',           name:'New Trier High School',                type:'high_school', city:'Winnetka',               state_abbr:'IL', zip:'60093', county:'Cook County',        district_name:'New Trier Township HSD' },
    { nces_id:'manual-boston-latin',        name:'Boston Latin School',                  type:'high_school', city:'Boston',                 state_abbr:'MA', zip:'02115', county:'Suffolk County',     district_name:'Boston Public Schools' },
    { nces_id:'manual-lakeside-wa',         name:'Lakeside School',                      type:'high_school', city:'Seattle',                state_abbr:'WA', zip:'98125', county:'King County',        district_name:'' },
    { nces_id:'manual-pine-crest',          name:'Pine Crest School',                    type:'high_school', city:'Fort Lauderdale',        state_abbr:'FL', zip:'33334', county:'Broward County',     district_name:'' },
    { nces_id:'manual-westminster-ga',      name:'The Westminster Schools',              type:'high_school', city:'Atlanta',                state_abbr:'GA', zip:'30327', county:'Fulton County',      district_name:'' },
    // Universities
    { nces_id:'manual-usc',                 name:'University of Southern California',    type:'university',  city:'Los Angeles',            state_abbr:'CA', zip:'90089', county:'Los Angeles County',  district_name:'' },
    { nces_id:'manual-ucla',                name:'UCLA',                                 type:'university',  city:'Los Angeles',            state_abbr:'CA', zip:'90095', county:'Los Angeles County',  district_name:'' },
    { nces_id:'manual-uc-irvine',           name:'UC Irvine',                            type:'university',  city:'Irvine',                 state_abbr:'CA', zip:'92697', county:'Orange County',      district_name:'' },
    { nces_id:'manual-uc-san-diego',        name:'UC San Diego',                         type:'university',  city:'La Jolla',               state_abbr:'CA', zip:'92093', county:'San Diego County',   district_name:'' },
    { nces_id:'manual-uc-santa-barbara',    name:'UC Santa Barbara',                     type:'university',  city:'Santa Barbara',          state_abbr:'CA', zip:'93106', county:'Santa Barbara County',district_name:'' },
    { nces_id:'manual-cal-state-fullerton', name:'Cal State Fullerton',                  type:'university',  city:'Fullerton',              state_abbr:'CA', zip:'92831', county:'Orange County',      district_name:'' },
    { nces_id:'manual-cal-poly-slo',        name:'Cal Poly San Luis Obispo',             type:'university',  city:'San Luis Obispo',        state_abbr:'CA', zip:'93407', county:'San Luis Obispo County',district_name:'' },
    { nces_id:'manual-uw-madison',          name:'University of Wisconsin-Madison',      type:'university',  city:'Madison',                state_abbr:'WI', zip:'53706', county:'Dane County',        district_name:'' },
    { nces_id:'manual-uw-milwaukee',        name:'University of Wisconsin-Milwaukee',    type:'university',  city:'Milwaukee',              state_abbr:'WI', zip:'53201', county:'Milwaukee County',   district_name:'' },
    { nces_id:'manual-marquette',           name:'Marquette University',                 type:'university',  city:'Milwaukee',              state_abbr:'WI', zip:'53233', county:'Milwaukee County',   district_name:'' },
    { nces_id:'manual-asu',                 name:'Arizona State University',             type:'university',  city:'Tempe',                  state_abbr:'AZ', zip:'85281', county:'Maricopa County',    district_name:'' },
    { nces_id:'manual-u-arizona',           name:'University of Arizona',                type:'university',  city:'Tucson',                 state_abbr:'AZ', zip:'85721', county:'Pima County',        district_name:'' },
    { nces_id:'manual-harvard',             name:'Harvard University',                   type:'university',  city:'Cambridge',              state_abbr:'MA', zip:'02138', county:'Middlesex County',   district_name:'' },
    { nces_id:'manual-stanford',            name:'Stanford University',                  type:'university',  city:'Stanford',               state_abbr:'CA', zip:'94305', county:'Santa Clara County', district_name:'' },
    { nces_id:'manual-mit',                 name:'MIT',                                  type:'university',  city:'Cambridge',              state_abbr:'MA', zip:'02139', county:'Middlesex County',   district_name:'' },
    { nces_id:'manual-nyu',                 name:'New York University',                  type:'university',  city:'New York',               state_abbr:'NY', zip:'10003', county:'New York County',    district_name:'' },
    { nces_id:'manual-columbia',            name:'Columbia University',                  type:'university',  city:'New York',               state_abbr:'NY', zip:'10027', county:'New York County',    district_name:'' },
    { nces_id:'manual-michigan',            name:'University of Michigan',               type:'university',  city:'Ann Arbor',              state_abbr:'MI', zip:'48109', county:'Washtenaw County',   district_name:'' },
    { nces_id:'manual-ohio-state',          name:'Ohio State University',                type:'university',  city:'Columbus',               state_abbr:'OH', zip:'43210', county:'Franklin County',    district_name:'' },
    { nces_id:'manual-ut-austin',           name:'University of Texas at Austin',        type:'university',  city:'Austin',                 state_abbr:'TX', zip:'78712', county:'Travis County',      district_name:'' },
    { nces_id:'manual-texas-am',            name:'Texas A&M University',                 type:'university',  city:'College Station',        state_abbr:'TX', zip:'77843', county:'Brazos County',      district_name:'' },
    { nces_id:'manual-unc',                 name:'UNC Chapel Hill',                      type:'university',  city:'Chapel Hill',            state_abbr:'NC', zip:'27599', county:'Orange County',      district_name:'' },
    { nces_id:'manual-duke',                name:'Duke University',                      type:'university',  city:'Durham',                 state_abbr:'NC', zip:'27708', county:'Durham County',      district_name:'' },
    { nces_id:'manual-uf',                  name:'University of Florida',                type:'university',  city:'Gainesville',            state_abbr:'FL', zip:'32611', county:'Alachua County',     district_name:'' },
    { nces_id:'manual-fsu',                 name:'Florida State University',             type:'university',  city:'Tallahassee',            state_abbr:'FL', zip:'32306', county:'Leon County',        district_name:'' },
    { nces_id:'manual-georgetown',          name:'Georgetown University',                type:'university',  city:'Washington',             state_abbr:'DC', zip:'20057', county:'District of Columbia',district_name:'' },
    { nces_id:'manual-notre-dame',          name:'University of Notre Dame',             type:'university',  city:'Notre Dame',             state_abbr:'IN', zip:'46556', county:'St. Joseph County',  district_name:'' },
    { nces_id:'manual-vanderbilt',          name:'Vanderbilt University',                type:'university',  city:'Nashville',              state_abbr:'TN', zip:'37240', county:'Davidson County',    district_name:'' },
    { nces_id:'manual-emory',               name:'Emory University',                     type:'university',  city:'Atlanta',                state_abbr:'GA', zip:'30322', county:'DeKalb County',      district_name:'' },
    { nces_id:'manual-penn-state',          name:'Penn State University',                type:'university',  city:'University Park',        state_abbr:'PA', zip:'16802', county:'Centre County',      district_name:'' },
    { nces_id:'manual-purdue',              name:'Purdue University',                    type:'university',  city:'West Lafayette',         state_abbr:'IN', zip:'47907', county:'Tippecanoe County',  district_name:'' },
  ];

  const { error } = await supabase
    .from('schools')
    .upsert(schools, { onConflict: 'nces_id', ignoreDuplicates: true });

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log(`✓ ${schools.length} priority schools inserted`);
  }
}

async function importCollegeScorecard() {
  console.log('\n🎓 Importing colleges from College Scorecard API...');

  const apiKey  = process.env.DATA_GOV_API_KEY || 'DEMO_KEY';
  let imported  = 0;
  let page      = 0;
  let hasMore   = true;
  let batch     = [];
  const perPage = 100;

  while (hasMore && page < 500) {
    try {
      const url = `https://api.data.gov/ed/collegescorecard/v1/schools.json?api_key=${apiKey}&fields=id,school.name,school.city,school.state,school.zip,school.ownership&per_page=${perPage}&page=${page}`;

      const data = await fetchJson(url);

      if (!data.results || data.results.length === 0) {
        hasMore = false;
        break;
      }

      for (const school of data.results) {
        const name = school['school.name'];
        if (!name) continue;

        const ownership = school['school.ownership'];
        const type = ownership === 1 ? 'university'
          : ownership === 2 ? 'college'
          : 'trade_school';

        batch.push({
          nces_id:       `scorecard-${school.id}`,
          name,
          type,
          city:          school['school.city']  || '',
          state_abbr:    school['school.state'] || '',
          state:         school['school.state'] || '',
          zip:           (school['school.zip']  || '').slice(0, 5),
          county:        '',
          district_name: '',
          is_active:     true,
        });

        if (batch.length >= BATCH_SIZE) {
          await upsertBatch(batch);
          imported += batch.length;
          batch     = [];
          process.stdout.write(`  Colleges: ${imported} imported...\r`);
        }
      }

      page++;
      await new Promise(r => setTimeout(r, 300));

      if (data.results.length < perPage) hasMore = false;

    } catch (err) {
      console.error(`\n  Page ${page} error:`, err.message);
      page++;
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (batch.length > 0) {
    await upsertBatch(batch);
    imported += batch.length;
  }

  console.log(`\n✓ Colleges imported: ${imported}`);
  return imported;
}

async function verifyImport() {
  const { count } = await supabase
    .from('schools')
    .select('*', { count: 'exact', head: true });

  const { data: sample } = await supabase
    .from('schools')
    .select('name, type, city, state_abbr')
    .order('name')
    .limit(8);

  console.log(`\n📊 Total schools in database: ${count}`);
  console.log('Sample:');
  sample?.forEach(s =>
    console.log(`  - ${s.name} (${s.type}) · ${s.city}, ${s.state_abbr}`)
  );
}
async function importHighSchools() {
  console.log('\n📚 Importing high schools from NCES CCD...');

  const apiKey  = process.env.DATA_GOV_API_KEY || 'DEMO_KEY';
  let imported  = 0;
  let page      = 0;
  let hasMore   = true;
  let batch     = [];
  const perPage = 100;

  while (hasMore && page < 400) {
    try {
      const url = `https://api.data.gov/ed/collegescorecard/v1/schools.json?api_key=${apiKey}&fields=id,school.name,school.city,school.state,school.zip,school.ownership,school.degrees_awarded.predominant&school.degrees_awarded.predominant=0&per_page=${perPage}&page=${page}`;

      // Use NCES CCD API for K-12
      const ccdUrl = `https://api.data.gov/ed/collegescorecard/v1/schools.json?api_key=${apiKey}&school.degrees_awarded.predominant=0&fields=id,school.name,school.city,school.state,school.zip&per_page=${perPage}&page=${page}`;

      const data = await fetchJson(ccdUrl);

      if (!data.results || data.results.length === 0) {
        hasMore = false;
        break;
      }

      for (const school of data.results) {
        const name = school['school.name'];
        if (!name) continue;

        batch.push({
          nces_id:       `ccd-hs-${school.id}`,
          name,
          type:          'high_school',
          city:          school['school.city']  || '',
          state_abbr:    school['school.state'] || '',
          state:         school['school.state'] || '',
          zip:           (school['school.zip']  || '').slice(0, 5),
          county:        '',
          district_name: '',
          is_active:     true,
        });

        if (batch.length >= BATCH_SIZE) {
          await upsertBatch(batch);
          imported += batch.length;
          batch     = [];
          process.stdout.write(`  High schools: ${imported} imported...\r`);
        }
      }

      page++;
      await new Promise(r => setTimeout(r, 300));

      if (data.results.length < perPage) hasMore = false;

    } catch (err) {
      console.error(`\n  Page ${page} error:`, err.message);
      page++;
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (batch.length > 0) {
    await upsertBatch(batch);
    imported += batch.length;
  }

  console.log(`\n✓ High schools imported: ${imported}`);
  return imported;
}
async function importHighSchoolsCCD() {
  console.log('\n📚 Importing high schools from Urban Institute CCD API...');

  // FIPS codes for all 50 states + DC
  const FIPS = [
    '01','02','04','05','06','08','09','10','11','12','13',
    '15','16','17','18','19','20','21','22','23','24','25',
    '26','27','28','29','30','31','32','33','34','35','36',
    '37','38','39','40','41','42','44','45','46','47','48',
    '49','50','51','53','54','55','56',
  ];

  const STATE_MAP = {
    '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO',
    '09':'CT','10':'DE','11':'DC','12':'FL','13':'GA','15':'HI',
    '16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY',
    '22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN',
    '28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH',
    '34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH',
    '40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD',
    '47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA',
    '54':'WV','55':'WI','56':'WY',
  };

  let totalImported = 0;
  let batch         = [];

  for (const fips of FIPS) {
    const stateAbbr = STATE_MAP[fips] || '';
    let page        = 1;
    let hasMore     = true;
    let stateCount  = 0;

    process.stdout.write(`  ${stateAbbr}: fetching...`);

    while (hasMore) {
      try {
        const url = `https://educationdata.urban.org/api/v1/schools/ccd/directory/2022/?fips_code=${fips}&school_level=3&per_page=2000&page=${page}`;
        const data = await fetchJson(url);

        if (!data.results || data.results.length === 0) {
          hasMore = false;
          break;
        }

        for (const school of data.results) {
          if (!school.school_name) continue;
          if (school.school_status === 2) continue; // skip closed

          const schoolType =
            school.school_level === 3 ? 'high_school' :
            school.school_level === 2 ? 'middle_school' :
            school.school_level === 1 ? 'elementary' :
            school.school_level === 4 ? 'other' :
            'other';

          const actualState = school.state_location || school.state_mailing || stateAbbr;
          batch.push({
            nces_id:       `ccd-${school.ncessch}`,
            name:          school.school_name,
            type:          schoolType,
            city:          school.city_location || school.city_mailing || '',
            state_abbr:    actualState,
            state:         actualState,
          });

          stateCount++;

          if (batch.length >= BATCH_SIZE) {
            await upsertBatch(batch);
            totalImported += batch.length;
            batch          = [];
          }
        }

        if (data.next) {
          page++;
          await new Promise(r => setTimeout(r, 300));
        } else {
          hasMore = false;
        }

      } catch (err) {
        console.error(`\n  ${stateAbbr} page ${page} error:`, err.message);
        hasMore = false;
      }
    }

    process.stdout.write(` ✓ ${stateCount}\n`);
  }

  // Final batch
  if (batch.length > 0) {
    await upsertBatch(batch);
    totalImported += batch.length;
  }

  console.log(`\n✓ High schools imported: ${totalImported}`);
  return totalImported;
}
async function main() {
  console.log('🏫 Un Momento Prints — School Import');
  console.log('=====================================');

  const start = Date.now();

  await importPrioritySchools();
  await importCollegeScorecard();
  await importHighSchoolsCCD();
  await verifyImport();

  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(`\n✅ Done in ${elapsed}s`);
}

main().catch(console.error);