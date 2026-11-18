/*
 * KKU Geotech Alumni Radar · app logic
 * Settings live in config.js. Data comes from the Google Sheet through apps-script/Code.gs.
 */
(function(){
'use strict';

/* ============ settings: edit config.js, not this file ============ */
var DEFAULTS = {
  apiUrl: '',
  latestBatch: 52,
  studyYears: 4,
  branchUrl: 'https://te.kku.ac.th/geotechnology/',
  branchEmail: '',
  shareUrl: '',
  cartoKey: '',
  tileUrl: 'https://basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}{r}.png?key={key}',
  tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution/">CARTO</a>'
};
var CONFIG = Object.assign({}, DEFAULTS, window.RADAR_CONFIG || {});
var DEMO = !CONFIG.apiUrl;   // no backend yet: show sample alumni and keep new pins in this browser only
var HOME = L.latLng(16.4745, 102.8234); // Khon Kaen University

var CAREERS = [
  {id:'eng', th:'วิศวกรรมธรณี และธรณีวิทยาวิศวกรรม', en:'Geotechnical & engineering geology'},
  {id:'gw',  th:'น้ำบาดาลและอุทกธรณีวิทยา', en:'Groundwater & hydrogeology'},
  {id:'env', th:'ธรณีวิทยาสิ่งแวดล้อมและภัยพิบัติ', en:'Environmental geology & geohazards'},
  {id:'min', th:'สำรวจแร่ เหมืองแร่ ปิโตรเลียม', en:'Mineral, mining & petroleum'},
  {id:'geo', th:'ธรณีฟิสิกส์ งานสำรวจ และภูมิสารสนเทศ', en:'Geophysics, survey & geospatial'},
  {id:'gov', th:'ราชการและรัฐวิสาหกิจ', en:'Government & state enterprise'},
  {id:'biz', th:'ที่ปรึกษา ก่อสร้าง ธุรกิจส่วนตัว', en:'Consulting, construction & business'},
  {id:'res', th:'วิจัย วิชาการ ศึกษาต่อ', en:'Research, academia & further study'},
  {id:'oth', th:'อื่นๆ', en:'Other'}
];
var LEVELS = [
  {id:'cur', th:'นักศึกษาปัจจุบัน', en:'Current student'},
  {id:'bsc', th:'ศิษย์เก่า ปริญญาตรี', en:'Alumnus/a, bachelor'},
  {id:'msc', th:'ศิษย์เก่า ปริญญาโท', en:'Alumnus/a, master'},
  {id:'phd', th:'ศิษย์เก่า ปริญญาเอก', en:'Alumnus/a, doctorate'}
];
var REGIONS = [
  {id:'Northeast', th:'ภาคอีสาน', en:'Northeast (Isan)'},
  {id:'Central', th:'ภาคกลางและกรุงเทพฯ', en:'Central & Bangkok'},
  {id:'East', th:'ภาคตะวันออก', en:'East'},
  {id:'North', th:'ภาคเหนือ', en:'North'},
  {id:'West', th:'ภาคตะวันตก', en:'West'},
  {id:'South', th:'ภาคใต้', en:'South'}
];
var ABROAD = [
  {id:'vte', th:'เวียงจันทน์ ลาว', en:'Vientiane, Laos', lat:17.9757, lon:102.6331},
  {id:'rgn', th:'ย่างกุ้ง เมียนมา', en:'Yangon, Myanmar', lat:16.8409, lon:96.1735},
  {id:'pnh', th:'พนมเปญ กัมพูชา', en:'Phnom Penh, Cambodia', lat:11.5564, lon:104.9282},
  {id:'han', th:'ฮานอย เวียดนาม', en:'Hanoi, Vietnam', lat:21.0285, lon:105.8542},
  {id:'sin', th:'สิงคโปร์', en:'Singapore', lat:1.3521, lon:103.8198},
  {id:'kul', th:'กัวลาลัมเปอร์ มาเลเซีย', en:'Kuala Lumpur, Malaysia', lat:3.139, lon:101.6869},
  {id:'jkt', th:'จาการ์ตา อินโดนีเซีย', en:'Jakarta, Indonesia', lat:-6.2088, lon:106.8456},
  {id:'tyo', th:'โตเกียว ญี่ปุ่น', en:'Tokyo, Japan', lat:35.6762, lon:139.6503},
  {id:'pek', th:'ปักกิ่ง จีน', en:'Beijing, China', lat:39.9042, lon:116.4074},
  {id:'per', th:'เพิร์ท ออสเตรเลีย', en:'Perth, Australia', lat:-31.9505, lon:115.8605},
  {id:'bne', th:'บริสเบน ออสเตรเลีย', en:'Brisbane, Australia', lat:-27.4698, lon:153.0251},
  {id:'dxb', th:'ดูไบ สหรัฐอาหรับเอมิเรตส์', en:'Dubai, UAE', lat:25.2048, lon:55.2708},
  {id:'lon', th:'ลอนดอน สหราชอาณาจักร', en:'London, UK', lat:51.5072, lon:-0.1276},
  {id:'hou', th:'ฮิวสตัน สหรัฐอเมริกา', en:'Houston, USA', lat:29.7604, lon:-95.3698},
  {id:'yyc', th:'แคลกะรี แคนาดา', en:'Calgary, Canada', lat:51.0447, lon:-114.0719}
];
var COUNTRY_LABELS = [
  {en:'Thailand', th:'ประเทศไทย', lat:15.1, lon:100.25, z0:4, z1:7.5},
  {en:'Laos', th:'ลาว', lat:19.9, lon:102.3, z0:4.25, z1:9},
  {en:'Myanmar', th:'เมียนมา', lat:21.2, lon:95.9, z0:4, z1:9},
  {en:'Cambodia', th:'กัมพูชา', lat:12.8, lon:104.9, z0:4.25, z1:9},
  {en:'Vietnam', th:'เวียดนาม', lat:14.2, lon:108.3, z0:4.25, z1:9},
  {en:'Malaysia', th:'มาเลเซีย', lat:4.9, lon:102.1, z0:4.25, z1:9},
  {en:'China', th:'จีน', lat:31, lon:104, z0:2.5, z1:7},
  {en:'India', th:'อินเดีย', lat:22.5, lon:79, z0:2.5, z1:7},
  {en:'Indonesia', th:'อินโดนีเซีย', lat:-1.6, lon:113.6, z0:3, z1:8},
  {en:'Philippines', th:'ฟิลิปปินส์', lat:12.3, lon:122.6, z0:4, z1:8},
  {en:'Australia', th:'ออสเตรเลีย', lat:-24.5, lon:134, z0:2, z1:6},
  {en:'Japan', th:'ญี่ปุ่น', lat:38.6, lon:140.2, z0:3, z1:8},
  {en:'United States', th:'สหรัฐอเมริกา', lat:39.5, lon:-99, z0:1.5, z1:6},
  {en:'Canada', th:'แคนาดา', lat:59, lon:-104, z0:1.5, z1:6},
  {en:'Russia', th:'รัสเซีย', lat:62, lon:96, z0:1.5, z1:5},
  {en:'Saudi Arabia', th:'ซาอุดีอาระเบีย', lat:23.8, lon:45, z0:3, z1:7},
  {en:'Brazil', th:'บราซิล', lat:-10, lon:-53, z0:1.5, z1:6}
];
var SEA_LABELS = [
  {en:'Gulf of Thailand', th:'อ่าวไทย', lat:9.6, lon:101.5, z0:4.5, z1:10},
  {en:'Andaman Sea', th:'ทะเลอันดามัน', lat:10.6, lon:96.6, z0:4.5, z1:10},
  {en:'South China Sea', th:'ทะเลจีนใต้', lat:13.6, lon:113.2, z0:4.25, z1:9},
  {en:'Indian Ocean', th:'มหาสมุทรอินเดีย', lat:-16, lon:80, z0:1.5, z1:4.25},
  {en:'Pacific Ocean', th:'มหาสมุทรแปซิฟิก', lat:14, lon:-150, z0:1.5, z1:4.25},
  {en:'Atlantic Ocean', th:'มหาสมุทรแอตแลนติก', lat:20, lon:-42, z0:1.5, z1:4.25}
];
var CITIES = [
  {en:'Bangkok', th:'กรุงเทพฯ', lat:13.7563, lon:100.5018, z0:4.5, pv:'10'},
  {en:'Chiang Mai', th:'เชียงใหม่', lat:18.7883, lon:98.9853, z0:4.75, pv:'50'},
  {en:'Nakhon Ratchasima', th:'นครราชสีมา', lat:14.9799, lon:102.0977, z0:5.5, pv:'30'},
  {en:'Udon Thani', th:'อุดรธานี', lat:17.4156, lon:102.7872, z0:6, pv:'41'},
  {en:'Ubon Ratchathani', th:'อุบลราชธานี', lat:15.2287, lon:104.8564, z0:5.5, pv:'34'},
  {en:'Phitsanulok', th:'พิษณุโลก', lat:16.8211, lon:100.2659, z0:6, pv:'65'},
  {en:'Rayong', th:'ระยอง', lat:12.6814, lon:101.2816, z0:6, pv:'21'},
  {en:'Surat Thani', th:'สุราษฎร์ธานี', lat:9.1382, lon:99.3217, z0:6, pv:'84'},
  {en:'Hat Yai', th:'หาดใหญ่', lat:7.0084, lon:100.4747, z0:6, pv:'90'},
  {en:'Phuket', th:'ภูเก็ต', lat:7.8804, lon:98.3923, z0:6, pv:'83'},
  {en:'Vientiane', th:'เวียงจันทน์', lat:17.9757, lon:102.6331, z0:4.75},
  {en:'Phnom Penh', th:'พนมเปญ', lat:11.5564, lon:104.9282, z0:4.75},
  {en:'Hanoi', th:'ฮานอย', lat:21.0285, lon:105.8542, z0:4.75},
  {en:'Ho Chi Minh City', th:'โฮจิมินห์', lat:10.8231, lon:106.6297, z0:5.25},
  {en:'Yangon', th:'ย่างกุ้ง', lat:16.8409, lon:96.1735, z0:4.75},
  {en:'Kuala Lumpur', th:'กัวลาลัมเปอร์', lat:3.139, lon:101.6869, z0:4.75},
  {en:'Singapore', th:'สิงคโปร์', lat:1.3521, lon:103.8198, z0:4.5},
  {en:'Tokyo', th:'โตเกียว', lat:35.6762, lon:139.6503, z0:3.5},
  {en:'Beijing', th:'ปักกิ่ง', lat:39.9042, lon:116.4074, z0:3.5},
  {en:'Perth', th:'เพิร์ท', lat:-31.9505, lon:115.8605, z0:3},
  {en:'Dubai', th:'ดูไบ', lat:25.2048, lon:55.2708, z0:3},
  {en:'Houston', th:'ฮิวสตัน', lat:29.7604, lon:-95.3698, z0:3},
  {en:'Calgary', th:'แคลกะรี', lat:51.0447, lon:-114.0719, z0:3},
  {en:'London', th:'ลอนดอน', lat:51.5072, lon:-0.1276, z0:3}
];

var I18N = {
th:{
 doc_title:'เรดาร์ศิษย์เก่าเทคโนโลยีธรณี', hdr_sub:'สาขาวิชาเทคโนโลยีธรณี มข.',
 menu:'เมนู', m_radar:'เรดาร์', m_brief:'ภารกิจของเรดาร์', m_battle:'อันดับรุ่น (Batch Battle)', m_pin:'ปักหมุดพิกัดของคุณ',
 stage_a:'แผนที่เรดาร์ศิษย์เก่า', demo_tag:'ข้อมูลสาธิต',
 v_th:'ประเทศไทย', v_world:'รอบโลก', v_scan:'ออโต้สแกน', v_cards:'มุมมองการ์ด',
 filter:'ตัวกรอง', clear:'ล้าง', clear_all:'ล้างตัวกรอง', done:'เสร็จ',
 f_batch:'รุ่น', f_batch_all:'ทุกรุ่น', f_grad:'ไม่มีรุ่น G', f_career:'สายงาน', f_career_all:'ทุกสายงาน', f_q:'ค้นหาชื่อเล่น',
 chips_a:'ประเภทสัญญาณ', c_all:'ทั้งหมด', c_job:'รับสมัครงาน', c_intern:'รับฝึกงาน/สหกิจ', c_share:'เล่าประสบการณ์',
 lg_pin:'ศิษย์เก่าหรือนักศึกษา 1 คน', lg_open:'เปิดรับสมัครงานหรือฝึกงาน', lg_cl:'หลายคนในพื้นที่ใกล้กัน', lg_home:'มหาวิทยาลัยขอนแก่น',
 scan_txt:'สแกน {i}/{n} · {name}', stop:'หยุด', empty:'ไม่พบสัญญาณตามตัวกรองนี้',
 bb_lead:'{g} นำอันดับ 1 ({n} หมุด)', bb_tie2:'{a} และ {b} นำร่วม ({n} หมุด)', bb_tieN:'{k} รุ่นนำร่วม ({n} หมุด)', bb_none:'ยังไม่มีหมุด', bb_more:'ดูอันดับทั้งหมด', n_pins:'{n} หมุด',
 cta:'ปักหมุดพิกัดของคุณ', cta_sub:'(PIN NODE)', share_a:'แชร์เรดาร์ให้เพื่อน', peek:'ภารกิจของเรดาร์ และอันดับรุ่น',
 brief_h:'เรดาร์นี้เชื่อมรุ่นพี่ รุ่นน้อง และอาจารย์เทคโนโลยี⁠ธรณี ไว้บนแผนที่เดียว',
 brief_p:'ปักหมุดที่ทำงานหรือที่เรียนของคุณ เพื่อให้รุ่นน้องหาพี่ๆ สายเดียวกัน ฟังเรื่องการเรียน การฝึกงาน และการทำงาน และรู้ว่าใครกำลังเปิดรับคนอยู่',
 o1_h:'สานสัมพันธ์ทุกชั้นปี', o1_p:'ศิษย์เก่าและนักศึกษาปัจจุบันมองเห็นกันบนแผนที่เดียว ตั้งแต่ G รุ่นแรกจนถึงน้องชั้นปีที่ 1',
 o2_h:'แลกเปลี่ยนประสบการณ์', o2_p:'เปิดโอกาสให้นักศึกษาได้รับฟังประสบการณ์ด้านการเรียน การฝึกงาน และการทำงานจากศิษย์เก่า',
 o3_h:'สร้างเครือข่ายวิชาชีพ', o3_p:'เชื่อมโยงนักศึกษา คณาจารย์ และศิษย์เก่า เพื่อเป็นแนวทางในการประกอบอาชีพในอนาคต',
 st_nodes:'หมุดทั้งหมด', st_batches:'รุ่น G ที่มีหมุด', st_regions:'จังหวัด/เมือง', st_hiring:'เปิดรับสมัครงาน', st_interns:'รับฝึกงาน/สหกิจ', st_mentors:'ยินดีเล่าประสบการณ์',
 demo_note:'โหมดสาธิต: ศิษย์เก่าบนแผนที่ตอนนี้เป็นข้อมูลสมมติ และหมุดที่เพิ่มจะหายเมื่อรีเฟรชหน้า จนกว่าจะต่อฐานข้อมูล',
 bt_h:'รุ่นไหนส่งสัญญาณมากที่สุด', bt_p:'นับหมุดของแต่ละรุ่น กดที่รุ่นเพื่อดูเฉพาะรุ่นนั้นบนแผนที่',
 wait_h:'ยังรอสัญญาณจาก {n} รุ่น', wait_none:'ครบทุกรุ่นแล้ว',
 inv_h:'ชวนเพื่อนรุ่นเดียวกันมาปักหมุด', inv_p:'ยิ่งรุ่นไหนปักหมุดเยอะ ยิ่งขึ้นนำใน Batch Battle', inv_l:'ข้อความชวนเพื่อน', inv_b:'คัดลอกข้อความ',
 inv_txt:'ชาวเทคโนโลยีธรณี มข. ทุกรุ่น มาปักหมุดบนเรดาร์ศิษย์เก่ากัน ให้รุ่นน้องหาพี่ๆ เจอ: {url}',
 copied:'คัดลอกข้อความชวนแล้ว วางใน LINE หรือ Messenger ได้เลย', copy_fail:'คัดลอกอัตโนมัติไม่ได้ ให้เลือกข้อความในช่องแล้วคัดลอกเอง',
 ft_a:'ต้นแบบหน้าเรดาร์ศิษย์เก่า สาขาวิชาเทคโนโลยีธรณี คณะเทคโนโลยี มหาวิทยาลัยขอนแก่น',
 ft_b:'ขอบเขตแผนที่: Natural Earth (ผ่าน world-atlas) และ OpenGISData-Thailand', ft_site:'เว็บไซต์สาขา', ft_mail:'ติดต่อสาขา',
 cv_h:'มุมมองการ์ด · {n} คน',
 fm_t:'ปักหมุดพิกัดศิษย์เก่าเทคโนโลยีธรณี มข.', fm_sub:'ร่วมสร้างแผนที่เครือข่ายเทคโนโลยีธรณี ใช้เวลาไม่เกิน 1 นาที', close:'ปิด',
 fm_demo:'โหมดสาธิต: ข้อมูลที่กรอกไม่ถูกส่งไปที่ใด และจะหายเมื่อรีเฟรชหน้า',
 fm_s1:'ข้อมูลบนแผนที่สาธารณะ', fm_nick:'ชื่อเล่น', fm_batch:'รุ่น', fm_batch_ph:'47',
 fm_batch_h:'พิมพ์เลขรุ่นต่อจาก G เช่น 1, 33, 47, 52', fm_batch_err:'ใส่เลขรุ่นตั้งแต่ 1 ถึง {max}', fm_nog:'ไม่มีรุ่น G (เรียนเฉพาะ ป.โท หรือ ป.เอก ที่นี่)',
 fm_level:'สถานะ', fm_career:'สายงาน หรือสายที่สนใจ', fm_place:'จังหวัดหรือเมืองที่ทำงาน/เรียนอยู่', fm_gps:'ใช้ตำแหน่งปัจจุบัน', fm_coord:'พิกัดที่จะแสดง',
 fm_drag:'ลากหมุดเพื่อปรับตำแหน่ง ระบบปัดพิกัดให้เหลือความละเอียดประมาณ 1 กม. เพื่อไม่ให้เห็นที่ตั้งแม่นยำ', mini_a:'แผนที่เลือกตำแหน่ง',
 fm_msg:'ข้อความถึงรุ่นน้อง (ไม่บังคับ)', fm_msg_h:'แสดงบนการ์ดสาธารณะ ไม่เกิน 140 ตัวอักษร',
 fm_s2:'เปิดโอกาสให้รุ่นน้อง (ไม่บังคับ)', fm_s2_note:'ช่องทางติดต่อจะแสดงบนการ์ดของคุณเฉพาะหัวข้อที่เลือกไว้ แต่ละหัวข้อแยกกัน',
 o_job:'รับสมัครงาน', o_job_d:'บริษัทหรือหน่วยงานของฉันกำลังรับพนักงาน', j_role:'ตำแหน่งที่เปิดรับ', j_contact:'ช่องทางติดต่อสำหรับสมัครงาน',
 o_intern:'รับฝึกงาน/สหกิจ', o_intern_d:'รับนักศึกษาฝึกงานหรือสหกิจศึกษา', i_role:'ลักษณะงานหรือสาขาที่รับ (ไม่บังคับ)', i_contact:'ช่องทางติดต่อสำหรับฝึกงาน/สหกิจ',
 o_share:'ยินดีเล่าประสบการณ์ให้รุ่นน้อง', o_share_d:'เป็นวิทยากร หรือให้รุ่นน้องมาพูดคุยด้วย', sh_topics:'หัวข้อที่เล่าได้',
 tp_study:'การเรียน', tp_intern:'การฝึกงาน/สหกิจ', tp_work:'การทำงาน', sh_contact:'ช่องทางให้สาขาประสานงาน (ไม่บังคับ)', fm_topics_err:'เลือกหัวข้อที่เล่าได้อย่างน้อย 1 หัวข้อ',
 contact_ph:'อีเมล, LINE ID, เบอร์โทร หรือลิงก์',
 fm_s3:'เก็บไว้ที่สาขา ไม่แสดงบนแผนที่', fm_full:'ชื่อ-นามสกุล', fm_full_h:'ใช้ตรวจสอบกับทะเบียนศิษย์เก่าก่อนนำหมุดขึ้นแผนที่ ต้นแบบนี้ไม่ได้บันทึกค่านี้',
 fm_consent:'ฉันยินยอมให้แสดงชื่อเล่น รุ่น สายงาน และตำแหน่ง (ปัดพิกัดแล้ว) บนแผนที่สาธารณะ และเข้าใจว่าช่องทางติดต่อที่กรอกจะแสดงตามหัวข้อที่เลือก',
 fm_cancel:'ยกเลิก', fm_submit:'ส่งสัญญาณพิกัด', fm_submit_sub:'(TRANSMIT)', fm_choose:'เลือก…', fm_abroad:'ต่างประเทศ',
 err_nick:'กรอกชื่อเล่น', err_batch:'ใส่เลขรุ่น หรือติ๊ก "ไม่มีรุ่น G"', err_level:'เลือกสถานะ', err_career:'เลือกสายงาน', err_place:'เลือกจังหวัดหรือเมือง',
 err_role:'กรอกตำแหน่งที่เปิดรับ', err_contact:'กรอกช่องทางติดต่อ', err_full:'กรอกชื่อ-นามสกุล', err_consent:'ติ๊กยินยอมก่อนส่ง',
 err_sum:'ยังกรอกไม่ครบ {n} ช่อง ดูช่องที่ขึ้นข้อความสีแดง', err_fail:'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง',
 toast_added:'ปักหมุดแล้ว หมุดของคุณขึ้นแผนที่แล้ว', toast_added_demo:'ปักหมุดแล้ว หมุดของคุณอยู่บนแผนที่ (โหมดสาธิต ยังไม่บันทึกถาวร)',
 net_loading:'กำลังรับสัญญาณจากฐานข้อมูล…', net_error:'โหลดหมุดไม่สำเร็จ', net_retry:'ลองใหม่',
 empty_first:'ยังไม่มีใครปักหมุด เป็นคนแรกเลย', empty_pin:'ปักหมุดคนแรก', fm_sending:'กำลังส่ง…',
 err_send:'ส่งไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่', err_busy:'ตอนนี้มีคนส่งพร้อมกันเยอะ รอสักครู่แล้วลองใหม่', err_invalid:'ข้อมูลบางช่องไม่ผ่านการตรวจ ({f}) แก้แล้วส่งใหม่',
 fm_full_h_live:'เก็บไว้ที่สาขาเพื่อตรวจสอบกับทะเบียนศิษย์เก่า ไม่แสดงบนแผนที่', ft_edit:'ขอแก้ไขหรือลบหมุดของคุณ: {mail}',
 gps_fail:'ใช้ตำแหน่งปัจจุบันไม่ได้ ให้เลือกจังหวัดแล้วลากหมุดแทน', gps_ok:'ใช้ตำแหน่งปัจจุบันแล้ว ปัดพิกัดเป็นระดับประมาณ 1 กม.',
 cd_job:'รับสมัครงาน', cd_intern:'รับฝึกงาน/สหกิจ', cd_share:'ยินดีเล่าประสบการณ์', cd_role:'ตำแหน่ง', cd_kind:'ลักษณะงาน', cd_contact:'ติดต่อ', cd_topics:'เรื่อง',
 cd_you:'หมุดของคุณ', cd_show:'ดูบนแผนที่', cd_here:'{n} คนในพื้นที่นี้ · กดชื่อเพื่อดูการ์ด',
 batch_tag:'รุ่น {g}', grad_tag:'บัณฑิตศึกษา', yr:'ชั้นปี {y}', thailand:'ประเทศไทย'
},
en:{
 doc_title:'Geotechnology Alumni Radar', hdr_sub:'Geotechnology · Khon Kaen University',
 menu:'Menu', m_radar:'Radar', m_brief:'Mission brief', m_battle:'Batch Battle', m_pin:'Pin your location',
 stage_a:'Alumni radar map', demo_tag:'SAMPLE DATA',
 v_th:'Thailand', v_world:'World', v_scan:'Auto-scan', v_cards:'Card view',
 filter:'Filters', clear:'Clear', clear_all:'Clear filters', done:'Done',
 f_batch:'Batch', f_batch_all:'All batches', f_grad:'No G batch', f_career:'Field', f_career_all:'All fields', f_q:'Search nickname',
 chips_a:'Signal type', c_all:'All', c_job:'Hiring', c_intern:'Internship / co-op', c_share:'Shares experience',
 lg_pin:'One alumnus or student', lg_open:'Hiring or taking interns', lg_cl:'Several people nearby', lg_home:'Khon Kaen University',
 scan_txt:'Scan {i}/{n} · {name}', stop:'Stop', empty:'No signals match these filters',
 bb_lead:'{g} leads ({n} pins)', bb_tie2:'{a} and {b} tie for the lead ({n} pins)', bb_tieN:'{k} batches tie for the lead ({n} pins)', bb_none:'No pins yet', bb_more:'See the full ranking', n_pins:'{n} pins',
 cta:'Pin your location', cta_sub:'', share_a:'Share the radar', peek:'Mission brief and batch ranking',
 brief_h:'One map that links Geotechnology seniors, juniors and faculty',
 brief_p:'Pin where you work or study so juniors can find seniors in the same field, hear about studying, internships and work, and see who is hiring.',
 o1_h:'Connect every class year', o1_p:'Alumni and current students see each other on one map, from the first G batch to this year’s first-years.',
 o2_h:'Share experience', o2_p:'Students hear about studying, internships and working life from alumni.',
 o3_h:'Build a professional network', o3_p:'Link students, faculty and alumni to guide students toward their future careers.',
 st_nodes:'Pins in total', st_batches:'G batches with pins', st_regions:'Provinces & cities', st_hiring:'Hiring', st_interns:'Taking interns / co-op', st_mentors:'Happy to share experience',
 demo_note:'Demo mode: every alumnus on the map is sample data, and pins you add disappear when the page reloads until a database is connected.',
 bt_h:'Which batch is sending the most signals?', bt_p:'Pins counted per batch. Select a batch to see only that batch on the map.',
 wait_h:'Still waiting for {n} batches', wait_none:'Every batch is on the map',
 inv_h:'Invite your batch to pin themselves', inv_p:'The more pins your batch has, the higher it climbs in the Batch Battle.', inv_l:'Invitation message', inv_b:'Copy message',
 inv_txt:'Geotechnology KKU, every batch: pin yourself on the alumni radar so juniors can find you: {url}',
 copied:'Invitation copied. Paste it into LINE or Messenger.', copy_fail:'Could not copy automatically. Select the text in the box and copy it.',
 ft_a:'Prototype alumni radar, Geotechnology, Faculty of Technology, Khon Kaen University',
 ft_b:'Map boundaries: Natural Earth (via world-atlas) and OpenGISData-Thailand', ft_site:'Programme website', ft_mail:'Contact the programme',
 cv_h:'Card view · {n} people',
 fm_t:'Pin your location: Geotechnology KKU alumni', fm_sub:'Help build the Geotechnology network map. It takes under a minute.', close:'Close',
 fm_demo:'Demo mode: what you enter is not sent anywhere and disappears when the page reloads.',
 fm_s1:'Shown on the public map', fm_nick:'Nickname', fm_batch:'Batch', fm_batch_ph:'47',
 fm_batch_h:'Type the number after G, e.g. 1, 33, 47, 52', fm_batch_err:'Enter a batch number from 1 to {max}', fm_nog:'No G batch (graduate study only here)',
 fm_level:'Status', fm_career:'Field, or field of interest', fm_place:'Province or city where you work or study', fm_gps:'Use my current location', fm_coord:'Coordinates shown',
 fm_drag:'Drag the pin to adjust. Coordinates are rounded to about 1 km so your exact address stays private.', mini_a:'Location picker map',
 fm_msg:'Message to juniors (optional)', fm_msg_h:'Shown on your public card, up to 140 characters',
 fm_s2:'Offer something to juniors (optional)', fm_s2_note:'Contact details appear on your card only under the options you tick. Each option is separate.',
 o_job:'Hiring', o_job_d:'My company or agency is recruiting', j_role:'Open positions', j_contact:'Contact for job applications',
 o_intern:'Internship / co-op', o_intern_d:'We accept internship or co-operative education students', i_role:'Type of work or field accepted (optional)', i_contact:'Contact for internships / co-op',
 o_share:'Happy to share experience with juniors', o_share_d:'Speak at events, or chat with students', sh_topics:'Topics I can talk about',
 tp_study:'Studying', tp_intern:'Internship / co-op', tp_work:'Working life', sh_contact:'Contact for the programme to coordinate (optional)', fm_topics_err:'Pick at least one topic you can talk about',
 contact_ph:'Email, LINE ID, phone or link',
 fm_s3:'Kept by the programme, not shown on the map', fm_full:'Full name', fm_full_h:'Used to check against the alumni register before a pin goes live. This prototype does not save it.',
 fm_consent:'I agree to show my nickname, batch, field and location (rounded) on the public map, and understand that any contact details I enter appear under the options I tick.',
 fm_cancel:'Cancel', fm_submit:'Transmit my pin', fm_submit_sub:'', fm_choose:'Choose…', fm_abroad:'Abroad',
 err_nick:'Enter a nickname', err_batch:'Enter a batch number, or tick "No G batch"', err_level:'Choose a status', err_career:'Choose a field', err_place:'Choose a province or city',
 err_role:'Enter the open position', err_contact:'Enter a contact', err_full:'Enter your full name', err_consent:'Tick the consent box before sending',
 err_sum:'{n} fields still need attention. Look for the red messages.', err_fail:'Could not send. Please try again.',
 toast_added:'Pinned. Your pin is on the map.', toast_added_demo:'Pinned. Your pin is on the map (demo mode, not saved permanently).',
 net_loading:'Receiving signals from the database…', net_error:'Could not load the pins', net_retry:'Try again',
 empty_first:'Nobody has pinned yet. Be the first.', empty_pin:'Pin the first one', fm_sending:'Sending…',
 err_send:'Could not send. Check your connection and try again.', err_busy:'Many people are sending right now. Wait a moment and try again.', err_invalid:'Some fields did not pass the check ({f}). Fix them and send again.',
 fm_full_h_live:'Kept by the programme to check against the alumni register. Not shown on the map.', ft_edit:'To edit or delete your pin: {mail}',
 gps_fail:'Could not use your current location. Choose a province and drag the pin instead.', gps_ok:'Using your current location, rounded to about 1 km.',
 cd_job:'Hiring', cd_intern:'Internship / co-op', cd_share:'Happy to share experience', cd_role:'Position', cd_kind:'Type of work', cd_contact:'Contact', cd_topics:'Topics',
 cd_you:'YOUR PIN', cd_show:'Show on map', cd_here:'{n} people here · select a name to open the card',
 batch_tag:'Batch {g}', grad_tag:'Graduate', yr:'Year {y}', thailand:'Thailand'
}};

var lang = 'th';
function t(k, v){ var s = I18N[lang][k]; if (s == null) s = I18N.th[k]; if (s == null) s = k; if (v) for (var n in v) s = s.split('{' + n + '}').join(v[n]); return s; }
function L10(o){ return o[lang] || o.en || o.th; }
function $(s, r){ return (r || document).querySelector(s); }
function $$(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
var SVGNS = 'http://www.w3.org/2000/svg';
function icon(name, cls){
  var s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('class', 'ic' + (cls ? ' ' + cls : '')); s.setAttribute('aria-hidden', 'true');
  var u = document.createElementNS(SVGNS, 'use');
  u.setAttribute('href', '#i-' + name);
  u.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#i-' + name);
  s.appendChild(u); return s;
}
function h(tag, props){
  var e = document.createElement(tag);
  if (props) for (var k in props){ var v = props[k]; if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
  for (var i = 2; i < arguments.length; i++){ var c = arguments[i]; if (c == null || c === false) continue;
    if (Array.isArray(c)) c.forEach(function(x){ if (x != null && x !== false) e.append(x.nodeType ? x : document.createTextNode(x)); });
    else e.append(c.nodeType ? c : document.createTextNode(c)); }
  return e;
}
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]; }); }
var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
function round2(v){ return Math.round(v * 100) / 100; }

/* ============ geometry (TopoJSON decoded in-page) ============ */
function topoToFC(topo, name){
  var obj = topo.objects[name], sc = topo.transform.scale, tr = topo.transform.translate;
  var arcs = topo.arcs.map(function(a){ var x = 0, y = 0; return a.map(function(p){ x += p[0]; y += p[1]; return [x * sc[0] + tr[0], y * sc[1] + tr[1]]; }); });
  function arcPts(i){ return i < 0 ? arcs[~i].slice().reverse() : arcs[i]; }
  function ring(ix){ var out = []; ix.forEach(function(i, k){ var p = arcPts(i); for (var j = k ? 1 : 0; j < p.length; j++) out.push(p[j]); }); return out; }
  var feats = [];
  obj.geometries.forEach(function(g){
    var geom = null;
    if (g.type === 'Polygon') geom = {type:'Polygon', coordinates:g.arcs.map(ring)};
    else if (g.type === 'MultiPolygon') geom = {type:'MultiPolygon', coordinates:g.arcs.map(function(p){ return p.map(ring); })};
    if (geom) feats.push({type:'Feature', properties:g.properties || {}, geometry:geom});
  });
  return {type:'FeatureCollection', features:feats};
}
var WORLD = topoToFC(window.RADAR_GEO.world, 'w');
var PROV = topoToFC(window.RADAR_GEO.provinces, 'p');
var PROV_BY = {};
PROV.features.forEach(function(f){ PROV_BY[f.properties.c] = f.properties; });

function inRing(x, y, r){ var c = false; for (var i = 0, j = r.length - 1; i < r.length; j = i++){ var xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }
function inPoly(x, y, poly){ if (!inRing(x, y, poly[0])) return false; for (var i = 1; i < poly.length; i++) if (inRing(x, y, poly[i])) return false; return true; }
function provinceAt(lat, lon){
  for (var i = 0; i < PROV.features.length; i++){ var g = PROV.features[i].geometry;
    var polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (var k = 0; k < polys.length; k++) if (inPoly(lon, lat, polys[k])) return PROV.features[i].properties.c; }
  return null;
}

/* ============ places ============ */
function placeInfo(key){
  if (key.indexOf('th:') === 0){ var p = PROV_BY[key.slice(3)]; return p ? {th:p.th, en:p.en, lat:p.lat, lon:p.lon} : null; }
  if (key.indexOf('ab:') === 0){ var a = ABROAD.filter(function(x){ return x.id === key.slice(3); })[0]; return a ? {th:a.th, en:a.en, lat:a.lat, lon:a.lon} : null; }
  return null;
}
function resolvePlace(selKey, lat, lon){
  var c = placeInfo(selKey);
  if (c && Math.abs(c.lat - lat) <= 1.2 && Math.abs(c.lon - lon) <= 1.2) return selKey;
  var pc = provinceAt(lat, lon);
  if (pc) return 'th:' + pc;
  return 'xy:' + (Math.round(lat / 2) * 2) + ',' + (Math.round(lon / 2) * 2);
}
function placeLabel(a){
  if (a.place.indexOf('th:') === 0){ var p = PROV_BY[a.place.slice(3)]; if (p) return (lang === 'th' ? p.th : p.en) + ', ' + t('thailand'); }
  var q = placeInfo(a.place);
  return q ? L10(q) : (a.lat.toFixed(2) + ', ' + a.lon.toFixed(2));
}

/* ============ pins (sample alumni in demo mode, the Google Sheet otherwise) ============ */
var DATA = [], nextId = 1, seq = {};
function assignCode(a){ var k = a.batch ? 'G' + a.batch : 'GR'; seq[k] = (seq[k] || 0) + 1; a.code = '#' + k + '-' + ('00' + seq[k]).slice(-3); }
function S(nick, g, level, career, place, o){
  o = o || {};
  var id = nextId++, c = placeInfo(place);
  var r1 = ((id * 9301 + 49297) % 233280) / 233280 - .5, r2 = ((id * 7919 + 12345) % 233280) / 233280 - .5;
  var a = {id:id, nick:nick, batch:g, level:level, career:career, place:place,
    lat:round2(c.lat + r1 * .09), lon:round2(c.lon + r2 * .09),
    msg:o.m ? {th:o.m[0], en:o.m[1]} : null,
    job:o.j ? {role:o.j[0], contact:o.j[1]} : null,
    intern:o.i ? {role:o.i[0], contact:o.i[1]} : null,
    share:o.s ? {topics:o.s[0], contact:o.s[1] || ''} : null, mine:false};
  assignCode(a);
  DATA.push(a);
}
if (DEMO){
S('ฟ้า',52,'cur','geo','th:40');
S('มินท์',51,'cur','env','th:40');
S('อาร์ม',51,'cur','eng','th:40');
S('นุ่น',50,'cur','geo','th:40');
S('เต้',49,'cur','env','th:19');
S('ภู',49,'cur','min','th:42');
S('ก้อง',48,'bsc','biz','th:11');
S('บีม',47,'bsc','eng','th:40',{j:['วิศวกรธรณีเทคนิค (จูเนียร์)','hr@example.com'],m:['ถ้าสนใจงานสำรวจดินภาคสนาม แวะมาคุยได้ครับ','Interested in field soil investigation? Come and talk to me.']});
S('เมย์',47,'bsc','env','th:47',{m:['อยากให้รุ่นน้องลองสมัครงานภาคสนามดูนะ','Do try applying for a fieldwork job.']});
S('แนน',47,'bsc','env','th:67');
S('เอก',47,'bsc','geo','th:60');
S('ไผ่',47,'bsc','gw','th:41');
S('พลอย',46,'bsc','eng','th:10',{s:[['intern','work'],'talk@example.com'],m:['การฝึกงานช่วยให้รู้ว่าชอบงานสนามหรืองานออฟฟิศมากกว่ากัน','An internship shows you whether you prefer fieldwork or office work.']});
S('ปลา',46,'bsc','gov','th:30');
S('หมิว',46,'bsc','eng','th:90');
S('ปอนด์',45,'bsc','gov','th:40',{i:['งานสำรวจและทำแผนที่ธรณี','LINE: @example-intern']});
S('จูน',45,'bsc','eng','th:20');
S('ท็อป',45,'bsc','gov','th:65');
S('ก้อย',45,'bsc','eng','ab:dxb');
S('เจ',44,'bsc','gw','th:13',{i:['งานเจาะบ่อบาดาลและทดสอบปริมาณน้ำ','LINE: @example-gw']});
S('มุก',44,'msc','eng','ab:sin');
S('ใบเตย',44,'msc','res','th:50',{s:[['study'],'']});
S('เอ็ม',43,'msc','res','th:40',{s:[['study','work'],'']});
S('ใหม่',43,'bsc','gov','th:34',{s:[['work'],'']});
S('ซัน',43,'bsc','biz','th:83');
S('นัท',43,'bsc','min','ab:hou');
S('แบงค์',42,'bsc','biz','th:10',{j:['เจ้าหน้าที่ประสานงานโครงการ','LINE: @example-jobs'],i:['งานเอกสารและสำรวจพื้นที่','intern@example.com']});
S('แพร',42,'bsc','gov','th:48');
S('กาน',42,'bsc','min','ab:vte',{j:['Exploration Geologist','recruit-la@example.com']});
S('โอ๊ต',41,'bsc','min','th:21',{j:['นักธรณีวิทยาเหมือง','mine-hr@example.com'],i:['งานสำรวจแร่','mine-intern@example.com'],s:[['intern','work'],'']});
S('ปุ๊ก',41,'bsc','min','th:84');
S('กั๊ก',40,'bsc','gw','th:41');
S('ตุ้ย',40,'bsc','gov','th:12');
S('โจ',40,'msc','min','ab:per',{j:['Geotechnical Engineer','au-careers@example.com'],s:[['study','work'],'au-talk@example.com'],m:['ยินดีแนะนำเรื่องทุนและการทำงานที่ออสเตรเลีย','Happy to advise on scholarships and working in Australia.']});
S('หนุ่ม',39,'bsc','gov','th:63');
S('ต้น',39,'phd','res','th:40',{s:[['study'],'']});
S('ไอซ์',38,'msc','eng','th:10',{j:['Geotechnical Engineer','careers@example.com']});
S('ดาว',38,'bsc','min','th:71',{i:['งานเหมืองและรายงานผลสำรวจ','LINE: @example-mine']});
S('ต๊อบ',37,'msc','res','th:44');
S('เบียร์',37,'phd','res','ab:tyo',{s:[['study'],'']});
S('ป้อม',33,'bsc','gw','th:36',{s:[['work'],''],m:['งานน้ำบาดาลยังต้องการคนอีกมาก โดยเฉพาะในอีสาน','Groundwater work still needs people, especially in Isan.']});
S('โต',29,'bsc','min','th:52',{i:['งานธรณีวิทยาเหมืองถ่านหิน','LINE: @example-lampang']});
S('เก่ง',26,'msc','eng','th:10',{j:['Senior Geotechnical Engineer','jobs@example.com'],s:[['work'],'']});
S('หน่อย',21,'bsc','gov','th:40',{s:[['work'],''],m:['เก็บสมุดภาคสนามไว้ให้ดี วันหนึ่งจะได้ใช้','Keep your field notebooks. You will need them one day.']});
S('ชัย',15,'bsc','min','ab:yyc',{s:[['work'],''],m:['งานปิโตรเลียมต่างประเทศเปิดกว้าง ภาษาอังกฤษสำคัญมาก','Petroleum jobs abroad are open to you. English matters a lot.']});
S('ปู',8,'bsc','gov','th:10',{s:[['work'],'']});
S('หลิว',0,'msc','res','th:40');
}

/* ============ labels for people ============ */
function yearOfStudy(g){ if (!g || !CONFIG.latestBatch) return 0; var y = CONFIG.latestBatch - g + 1; return (y >= 1 && y <= CONFIG.studyYears) ? y : 0; }
function levelLabel(a){
  var l = LEVELS.filter(function(x){ return x.id === a.level; })[0], s = l ? L10(l) : '';
  if (a.level === 'cur'){ var y = yearOfStudy(a.batch); if (y) s += ' · ' + t('yr', {y:y}); }
  return s;
}
function careerLabel(id){ var c = CAREERS.filter(function(x){ return x.id === id; })[0]; return c ? L10(c) : ''; }
function gName(b){ return b ? 'G' + b : t('grad_tag'); }
function batchTag(a){ return a.batch ? t('batch_tag', {g:'G' + a.batch}) : t('grad_tag'); }

/* ============ state + filters ============ */
var state = {view:'th', batch:'', career:'', q:'', chip:'all'};
function filtered(){
  var q = state.q.trim().toLowerCase();
  return DATA.filter(function(a){
    if (state.batch !== '' && String(a.batch) !== state.batch) return false;
    if (state.career && a.career !== state.career) return false;
    if (q && a.nick.toLowerCase().indexOf(q) < 0) return false;
    if (state.chip === 'job' && !a.job) return false;
    if (state.chip === 'intern' && !a.intern) return false;
    if (state.chip === 'share' && !a.share) return false;
    return true;
  });
}
function anyFilter(){ return state.batch !== '' || !!state.career || !!state.q.trim() || state.chip !== 'all'; }
function offersOf(a){ return (a.job ? 1 : 0) + (a.intern ? 1 : 0) + (a.share ? 1 : 0); }
function sorted(list){ return list.slice().sort(function(a, b){ return (offersOf(b) - offersOf(a)) || ((b.batch || 0) - (a.batch || 0)) || a.nick.localeCompare(b.nick, 'th'); }); }

/* ============ backend (Google Sheets + Apps Script) ============ */
var MINE_KEY = 'geotechRadarMine', MINE = [];
try { MINE = JSON.parse(localStorage.getItem(MINE_KEY) || '[]'); if (!Array.isArray(MINE)) MINE = []; } catch (e) { MINE = []; }
function saveMine(){ try { localStorage.setItem(MINE_KEY, JSON.stringify(MINE.slice(-20))); } catch (e) {} }
function fromApi(p){
  if (!p) return null;
  var lat = Number(p.lat), lon = Number(p.lon);
  if (!isFinite(lat) || !isFinite(lon)) return null;
  var topics = Array.isArray(p.share_topics) ? p.share_topics : [];
  return {id:String(p.id), created:String(p.created_at || ''), nick:String(p.nickname || ''), batch:Math.max(0, parseInt(p.batch, 10) || 0),
    level:String(p.level || ''), career:String(p.career || ''), place:String(p.place || ''), lat:lat, lon:lon,
    msg:p.message ? String(p.message) : null,
    job:p.job_contact ? {role:String(p.job_role || ''), contact:String(p.job_contact)} : null,
    intern:p.intern_contact ? {role:String(p.intern_role || ''), contact:String(p.intern_contact)} : null,
    share:topics.length ? {topics:topics.slice(), contact:String(p.share_contact || '')} : null,
    mine:MINE.indexOf(String(p.id)) >= 0};
}
function assignCodes(){
  seq = {};
  DATA.slice().sort(function(a, b){ return a.created.localeCompare(b.created) || a.id.localeCompare(b.id); }).forEach(assignCode);
}
function apiCall(method, payload){
  var opts = {method:method, redirect:'follow', cache:'no-store'};
  if (payload){ opts.headers = {'Content-Type':'text/plain;charset=utf-8'}; opts.body = JSON.stringify(payload); }
  return fetch(CONFIG.apiUrl, opts).then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
}
var loaded = DEMO, netState = '';
function setNet(s){
  netState = s;
  var p = $('#netpill');
  p.hidden = !s;
  if (s){ p.dataset.state = s; $('#net-txt').textContent = t(s === 'loading' ? 'net_loading' : 'net_error'); $('#net-retry').hidden = s !== 'error'; }
  measure();
}
function loadPins(){
  setNet('loading');
  apiCall('GET').then(function(res){
    if (!res || res.ok !== true || !Array.isArray(res.pins)) throw new Error('bad response');
    DATA = res.pins.map(fromApi).filter(Boolean);
    assignCodes();
    loaded = true; setNet('');
    renderFilterSelects(); update();
    if (!userMoved && state.view === 'th') fitTH();
  }).catch(function(err){
    if (window.console) console.error(err);
    loaded = true; setNet('error'); update();
  });
}

/* ============ person card ============ */
function contactNode(text){
  var s = String(text).trim();
  if (/^https?:\/\/\S+$/i.test(s)) return h('a', {href:s, target:'_blank', rel:'noopener noreferrer', text:s});
  return document.createTextNode(s);
}
function offerBlock(ic, title, rows){
  var d = h('div', {class:'offer'}, h('b', null, icon(ic), title));
  rows.forEach(function(r){ if (r) d.append(h('div', null, h('span', {class:'k', text:r[0] + ': '}), r[1].nodeType ? r[1] : document.createTextNode(r[1]))); });
  return d;
}
function cardEl(a, opts){
  opts = opts || {};
  var msg = a.msg ? (typeof a.msg === 'string' ? a.msg : (a.msg[lang] || a.msg.th)) : '';
  var el = h('article', {class:'node'},
    h('div', {class:'node-h'}, h('span', {class:'nid', text:a.code}), h('span', {class:'nb', text:batchTag(a)})),
    h('h3', {class:'nn'}, a.nick, a.mine ? h('span', {class:'you', text:t('cd_you')}) : null),
    h('p', {class:'nf', text:careerLabel(a.career)}),
    h('p', {class:'nm', text:levelLabel(a)}),
    h('p', {class:'np'}, icon('pin'), h('span', {text:placeLabel(a)})),
    msg ? h('blockquote', {class:'nq', text:'“' + msg + '”'}) : null,
    a.job ? offerBlock('brief', t('cd_job'), [[t('cd_role'), a.job.role], [t('cd_contact'), contactNode(a.job.contact)]]) : null,
    a.intern ? offerBlock('cap', t('cd_intern'), [a.intern.role ? [t('cd_kind'), a.intern.role] : null, [t('cd_contact'), contactNode(a.intern.contact)]]) : null,
    a.share ? offerBlock('mic', t('cd_share'), [[t('cd_topics'), a.share.topics.map(function(x){ return t('tp_' + x); }).join(' · ')], a.share.contact ? [t('cd_contact'), contactNode(a.share.contact)] : null]) : null
  );
  if (opts.go) el.append(h('button', {type:'button', class:'tb sm go', text:t('cd_show'), onclick:function(){ showOnMap(a); }}));
  return el;
}

/* ============ stage measurement (HUD panels sit over the map) ============ */
var stage = $('#radar'), ovTop = $('#ov-top'), ovBot = $('#ov-bot');
var pads = {top:170, bot:130};
function measure(){
  var sr = stage.getBoundingClientRect();
  if (!sr.height) return;
  var tr = ovTop.getBoundingClientRect(), br = ovBot.getBoundingClientRect();
  pads.top = Math.max(0, Math.round(tr.bottom - sr.top));
  pads.bot = Math.max(0, Math.round(sr.bottom - br.top));
  stage.style.setProperty('--top-h', pads.top + 'px');
  stage.style.setProperty('--bot-h', pads.bot + 'px');
}

/* ============ map ============ */
var MAXZ = 11, CELL = 40, PROV_LABEL_Z = 7.5;
var basemap = 'vector';
var map = L.map('map-el', {zoomSnap:.25, zoomDelta:.5, wheelPxPerZoomLevel:90, minZoom:1, maxZoom:MAXZ, zoomControl:false, attributionControl:false, maxBoundsViscosity:1, keyboard:true});
L.control.zoom({position:'topright'}).addTo(map);
map.setMaxBounds([[-75, -200], [88, 200]]);
map.setView([13, 101], 5, {animate:false});
[['sweep', 430], ['labels', 460]].forEach(function(p){ var el = map.createPane(p[0]); el.style.zIndex = p[1]; el.style.pointerEvents = 'none'; });

function landStyle(){ return basemap === 'tiles' ? {fillOpacity:0, opacity:0} : {fillColor:'#1b1f25', fillOpacity:1, color:'#454d57', weight:.8, opacity:1}; }
function provStyle(){
  var z = map.getZoom();
  if (basemap === 'tiles') return {fillOpacity:0, color:'#c9d1d9', opacity:z < 6 ? .14 : .22, weight:z < 6 ? .6 : .8};
  return {fillColor:'#21262d', fillOpacity:1, color:'#39414a', opacity:1, weight:z < 6 ? .55 : .8};
}
var worldLayer = L.geoJSON(WORLD, {style:landStyle, interactive:false}).addTo(map);
var provLayer = L.geoJSON(PROV, {style:provStyle, interactive:false}).addTo(map);

/* optional detailed basemap: only when a CARTO key is set, falls back to the outline map if tiles fail */
if (CONFIG.cartoKey){
  var tiles = L.tileLayer(CONFIG.tileUrl, {key:CONFIG.cartoKey, maxNativeZoom:18, maxZoom:20, attribution:CONFIG.tileAttribution});
  var tilesOk = false, tileErrs = 0;
  var dropTiles = function(){ if (tilesOk || !map.hasLayer(tiles)) return; map.removeLayer(tiles); };
  tiles.on('tileload', function(){
    if (tilesOk) return;
    tilesOk = true; basemap = 'tiles';
    worldLayer.setStyle(landStyle()); provLayer.setStyle(provStyle());
    L.control.attribution({prefix:false, position:'bottomright'}).addAttribution(CONFIG.tileAttribution).addTo(map);
  });
  tiles.on('tileerror', function(){ tileErrs++; if (tileErrs >= 3) dropTiles(); });
  setTimeout(dropTiles, 6000);
  tiles.addTo(map);
}

/* radar rings anchored on KKU */
var sweepEl = L.DomUtil.create('div', 'sweep leaflet-zoom-animated', map.getPane('sweep'));
sweepEl.innerHTML = '<div class="sw-rings"></div><div class="sw-x"></div><div class="sw-y"></div><div class="sw-beam"></div>';
function placeSweep(){ L.DomUtil.setPosition(sweepEl, map.latLngToLayerPoint(HOME)); }
map.on('zoom viewreset', placeSweep);
map.on('zoomanim', function(e){ L.DomUtil.setPosition(sweepEl, map._latLngToNewLayerPoint(HOME, e.zoom, e.center)); });
placeSweep();

/* basemap labels */
var labelLayer = L.layerGroup().addTo(map), LBL = [];
function lblIcon(html){ return L.divIcon({className:'lbw', html:html, iconSize:[0, 0], iconAnchor:[0, 0]}); }
function lblHtml(l){
  var it = l.it, name = it[lang] || it.en;
  if (l.kind === 'c') return '<span class="lb lb-c">' + esc(lang === 'en' ? name.toUpperCase() : name) + '</span>';
  if (l.kind === 's') return '<span class="lb lb-s">' + esc(name) + '</span>';
  if (l.kind === 'city') return '<span class="lb lb-city"><i></i>' + esc(name) + '</span>';
  if (l.kind === 'p') return '<span class="lb lb-p">' + esc(name) + '</span>';
  return '<span class="lb lb-home"><i class="hx"></i>KKU</span>';
}
function addLbl(it, kind){ var l = {it:it, kind:kind, on:false}; l.m = L.marker([it.lat, it.lon], {pane:'labels', interactive:false, keyboard:false, icon:lblIcon(lblHtml(l))}); LBL.push(l); }
COUNTRY_LABELS.forEach(function(c){ addLbl(c, 'c'); });
SEA_LABELS.forEach(function(c){ addLbl(c, 's'); });
CITIES.forEach(function(c){ addLbl(c, 'city'); });
PROV.features.forEach(function(f){ var p = f.properties; addLbl({th:p.th, en:p.en, lat:p.lat, lon:p.lon, z0:PROV_LABEL_Z}, 'p'); });
addLbl({th:'KKU', en:'KKU', lat:HOME.lat, lon:HOME.lng, z0:3.5}, 'home');
function refreshLabelText(){ LBL.forEach(function(l){ l.m.setIcon(lblIcon(lblHtml(l))); }); }
function updateLabels(){
  var z = map.getZoom();
  LBL.forEach(function(l){
    var it = l.it, vis = z >= it.z0 && z < (it.z1 || 99);
    if (l.kind === 'city' && it.pv && z >= PROV_LABEL_Z) vis = false;
    if (vis && !l.on){ labelLayer.addLayer(l.m); l.on = true; }
    else if (!vis && l.on){ labelLayer.removeLayer(l.m); l.on = false; }
  });
}

/* pins */
var pinLayer = L.layerGroup().addTo(map);
function pinIcon(a){ var cls = 'pn' + ((a.job || a.intern) ? ' open' : '') + (a.mine ? ' mine' : ''); return L.divIcon({className:'pin-wrap', html:'<span class="' + cls + '"></span>', iconSize:[22, 22], iconAnchor:[11, 11]}); }
function clusterIcon(n){ var s = n < 10 ? 34 : n < 25 ? 40 : 46; return L.divIcon({className:'pin-wrap', html:'<span class="cl" style="width:' + s + 'px;height:' + s + 'px">' + n + '</span>', iconSize:[s, s], iconAnchor:[s / 2, s / 2]}); }
function popOpts(){
  var avail = stage.clientHeight - pads.top - pads.bot - 40;
  return {className:'gp', maxWidth:300, minWidth:250, maxHeight:Math.max(190, avail), autoPanPaddingTopLeft:L.point(14, pads.top + 10), autoPanPaddingBottomRight:L.point(14, pads.bot + 10)};
}
function openCard(a, ll){ L.popup(popOpts()).setLatLng(ll || [a.lat, a.lon]).setContent(cardEl(a)).openOn(map); }
function listPopup(items, ll){
  var box = h('div', {class:'plist'}, h('p', {text:t('cd_here', {n:items.length})}));
  sorted(items).forEach(function(a){
    box.append(h('button', {type:'button', onclick:function(){ openCard(a); }}, h('b', {text:a.nick}), h('small', {text:gName(a.batch) + ' · ' + careerLabel(a.career)})));
  });
  L.popup(popOpts()).setLatLng(ll).setContent(box).openOn(map);
}
function renderMarkers(){
  pinLayer.clearLayers();
  var list = filtered(), z = map.getZoom(), buckets = {}, order = [];
  list.forEach(function(a){
    var key;
    if (a.mine) key = 'm' + a.id;
    else { var p = map.project([a.lat, a.lon], z); key = Math.floor(p.x / CELL) + ':' + Math.floor(p.y / CELL); }
    if (!buckets[key]){ buckets[key] = []; order.push(key); }
    buckets[key].push(a);
  });
  order.forEach(function(k){
    var g = buckets[k];
    if (g.length === 1){
      var a = g[0];
      L.marker([a.lat, a.lon], {icon:pinIcon(a), title:a.nick + ' · ' + gName(a.batch), keyboard:true, riseOnHover:true, zIndexOffset:a.mine ? 900 : ((a.job || a.intern) ? 200 : 100)})
        .on('click', function(){ openCard(a); }).addTo(pinLayer);
    } else {
      var lat = 0, lon = 0; g.forEach(function(a){ lat += a.lat; lon += a.lon; });
      var ll = L.latLng(lat / g.length, lon / g.length);
      L.marker(ll, {icon:clusterIcon(g.length), title:t('cd_here', {n:g.length}), keyboard:true, zIndexOffset:300}).on('click', function(){
        var b = L.latLngBounds(g.map(function(a){ return [a.lat, a.lon]; }));
        var tiny = b.getNorthEast().distanceTo(b.getSouthWest()) < 800;
        if (tiny || map.getZoom() >= MAXZ - 1) listPopup(g, ll);
        else map.fitBounds(b.pad(.5), Object.assign(fitOpts(), {maxZoom:Math.min(MAXZ, map.getZoom() + 3)}));
      }).addTo(pinLayer);
    }
  });
}
map.on('zoomend', function(){ provLayer.setStyle(provStyle()); updateLabels(); renderMarkers(); });

/* framing */
var TH_B = L.latLngBounds([[5.6, 97.4], [20.5, 105.7]]), TH_MAIN = L.latLngBounds([[12.4, 98.2], [19.9, 105.5]]), WORLD_B = L.latLngBounds([[-42, -165], [68, 170]]);
function fitOpts(){ return {paddingTopLeft:L.point(12, pads.top + 4), paddingBottomRight:L.point(12, pads.bot + 4), animate:!reduced}; }
function fitTH(){
  // small screens: frame the mainland (north, Isan, Bangkok) closer, as most pins are there; the south is a pan away
  var clear = stage.clientHeight - pads.top - pads.bot;
  map.fitBounds(clear < 430 ? TH_MAIN : TH_B, fitOpts());
}
function fitWorld(){ map.fitBounds(WORLD_B, fitOpts()); }
function fixMinZoom(){
  var s = map.getSize(); if (!s.x || !s.y) return;
  map.invalidateSize();
  map.setMinZoom(Math.max(1, map.getBoundsZoom([[-58, -180], [80, 180]], true)));
}
function fitToList(list){
  if (!list.length) return;
  var b = L.latLngBounds(list.map(function(a){ return [a.lat, a.lon]; }));
  map.fitBounds(b.pad(.3), Object.assign(fitOpts(), {maxZoom:8}));
}

/* ============ views ============ */
function pressView(v){ $$('[data-view]').forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.view === v)); }); }
function setView(v, keep){
  if (v !== 'scan') stopScan(true);
  state.view = v;
  pressView(v);
  var cards = v === 'cards';
  stage.classList.toggle('mode-cards', cards);
  $('#cards').hidden = !cards;
  if (cards){ map.closePopup(); renderCards(); return; }
  requestAnimationFrame(function(){
    measure(); fixMinZoom();
    if (v === 'th' && !keep) fitTH();
    else if (v === 'world') fitWorld();
    else if (v === 'scan') startScan();
    renderMarkers();
  });
}
$$('[data-view]').forEach(function(b){ b.addEventListener('click', function(){ setFilterPanel(false); setView(b.dataset.view); }); });

var scanTimer = null, scanList = [], scanIdx = 0;
function scanStep(){
  if (!scanList.length) return stopScan(false);
  var a = scanList[scanIdx % scanList.length]; scanIdx++;
  $('#scan-txt').textContent = t('scan_txt', {i:((scanIdx - 1) % scanList.length) + 1, n:scanList.length, name:a.nick});
  map.closePopup();
  if (reduced) map.setView([a.lat, a.lon], 8, {animate:false}); else map.flyTo([a.lat, a.lon], 8, {duration:1.5});
  setTimeout(function(){ if (scanTimer) openCard(a); }, reduced ? 60 : 1650);
}
function startScan(){
  stopScan(true);
  scanList = sorted(filtered());
  if (!scanList.length){ state.view = 'th'; pressView('th'); return; }
  scanIdx = 0; $('#scan-hud').hidden = false; stage.classList.add('scanning');
  measure();
  scanStep(); scanTimer = setInterval(scanStep, 4800);
}
function stopScan(silent){
  if (scanTimer){ clearInterval(scanTimer); scanTimer = null; }
  $('#scan-hud').hidden = true; stage.classList.remove('scanning');
  if (!silent && state.view === 'scan'){ state.view = 'th'; pressView('th'); }
  measure();
}
$('#scan-stop').addEventListener('click', function(){ stopScan(false); });
$('#map-el').addEventListener('pointerdown', function(){ if (scanTimer) stopScan(false); });

function renderCards(){
  var box = $('#cards'), list = sorted(filtered());
  box.textContent = '';
  box.append(h('p', {class:'cv-h'}, h('span', {text:t('cv_h', {n:list.length})}), h('span', {text:'// CARD_VIEW //'})));
  var grid = h('div', {class:'cv-grid'});
  list.forEach(function(a){ grid.append(cardEl(a, {go:true})); });
  box.append(grid);
}
function showOnMap(a){
  setFilterPanel(false);
  setView('th', true);
  setTimeout(function(){
    map.setView([a.lat, a.lon], Math.max(map.getZoom(), 9), {animate:false});
    renderMarkers();
    setTimeout(function(){ openCard(a); }, 60);
    if (stage.scrollIntoView) stage.scrollIntoView({block:'start', behavior:reduced ? 'auto' : 'smooth'});
  }, 80);
}

/* ============ filters panel ============ */
var fpanel = $('#fpanel'), fbtn = $('#btn-filter');
function setFilterPanel(open){ fpanel.hidden = !open; fbtn.setAttribute('aria-expanded', String(open)); }
fbtn.addEventListener('click', function(){ setFilterPanel(fpanel.hidden); });
$('#f-done').addEventListener('click', function(){ setFilterPanel(false); });
function clearFilters(){
  state.batch = ''; state.career = ''; state.q = ''; state.chip = 'all';
  $('#f-batch').value = ''; $('#f-career').value = ''; $('#f-q').value = '';
  update();
}
$('#f-clear').addEventListener('click', clearFilters);
$('#fclear').addEventListener('click', clearFilters);
$('#empty-x').addEventListener('click', clearFilters);
$('#f-batch').addEventListener('change', function(e){ state.batch = e.target.value; update(); });
$('#f-career').addEventListener('change', function(e){ state.career = e.target.value; update(); });
$('#f-q').addEventListener('input', function(e){ state.q = e.target.value; update(); });
$$('#chips .chip').forEach(function(c){ c.addEventListener('click', function(){ state.chip = c.dataset.chip; update(); }); });

function fillSelect(sel, items, keep){
  var cur = keep != null ? keep : sel.value;
  sel.textContent = '';
  items.forEach(function(o){
    if (o.group){ var g = h('optgroup', {label:o.group}); o.items.forEach(function(x){ g.append(h('option', {value:x.v, text:x.t})); }); sel.append(g); }
    else sel.append(h('option', {value:o.v, text:o.t}));
  });
  sel.value = cur;
  if (sel.value !== cur && sel.options.length) sel.selectedIndex = 0;
}
function renderFilterSelects(){
  var counts = {}, grad = 0;
  DATA.forEach(function(a){ if (a.batch) counts[a.batch] = (counts[a.batch] || 0) + 1; else grad++; });
  var opts = [{v:'', t:t('f_batch_all')}];
  Object.keys(counts).map(Number).sort(function(a, b){ return b - a; }).forEach(function(g){ opts.push({v:String(g), t:'G' + g + '  (' + counts[g] + ')'}); });
  if (grad) opts.push({v:'0', t:t('f_grad') + '  (' + grad + ')'});
  fillSelect($('#f-batch'), opts, state.batch);
  state.batch = $('#f-batch').value;
  var co = [{v:'', t:t('f_career_all')}];
  CAREERS.forEach(function(c){ co.push({v:c.id, t:L10(c)}); });
  fillSelect($('#f-career'), co, state.career);
}

/* ============ batch battle + stats ============ */
function batchRows(){
  var counts = {};
  DATA.forEach(function(a){ if (a.batch) counts[a.batch] = (counts[a.batch] || 0) + 1; });
  var rows = Object.keys(counts).map(function(k){ return {g:+k, n:counts[k]}; }).sort(function(x, y){ return (y.n - x.n) || (x.g - y.g); });
  var rank = 0, prev = null;
  rows.forEach(function(r, i){ if (r.n !== prev){ rank = i + 1; prev = r.n; } r.rank = rank; });
  return rows;
}
function ranges(nums){
  var out = [], i = 0;
  while (i < nums.length){ var s = nums[i], e = s; while (i + 1 < nums.length && nums[i + 1] === e + 1){ i++; e = nums[i]; } out.push(s === e ? 'G' + s : 'G' + s + '–G' + e); i++; }
  return out.join(' · ');
}
function pickBatch(g){
  state.batch = state.batch === String(g) ? '' : String(g);
  $('#f-batch').value = state.batch;
  if (state.view === 'scan') stopScan(false);
  $('#bb-toggle').setAttribute('aria-expanded', 'false'); $('#bb-list').hidden = true;
  update();
  if (state.view !== 'cards'){ map.closePopup(); fitToList(filtered()); }
  if (stage.scrollIntoView) stage.scrollIntoView({block:'start', behavior:reduced ? 'auto' : 'smooth'});
}
function rankBtn(r, max, cls){
  var fill = h('i'); fill.style.width = Math.max(6, r.n / max * 100) + '%';
  return h('button', {type:'button', class:cls + (r.rank <= 3 ? ' top' : ''), 'aria-pressed':String(state.batch === String(r.g)), onclick:function(){ pickBatch(r.g); }},
    h('span', {class:'no', text:'#' + r.rank}), h('span', {class:'g', text:'G' + r.g}), h('span', {class:'bar'}, fill), h('span', {class:'n', text:t('n_pins', {n:r.n})}));
}
function renderBattle(){
  var rows = batchRows(), max = rows.length ? rows[0].n : 1, lead;
  if (!rows.length) lead = t('bb_none');
  else {
    var top = rows.filter(function(r){ return r.n === rows[0].n; });
    lead = top.length === 1 ? t('bb_lead', {g:'G' + top[0].g, n:top[0].n}) : top.length === 2 ? t('bb_tie2', {a:'G' + top[0].g, b:'G' + top[1].g, n:top[0].n}) : t('bb_tieN', {k:top.length, n:top[0].n});
  }
  $('#bb-lead').textContent = lead;
  var bl = $('#bb-list'); bl.textContent = '';
  rows.slice(0, 5).forEach(function(r){ bl.append(rankBtn(r, max, 'bb-row')); });
  bl.append(h('a', {class:'bb-more', href:'#battle', text:t('bb_more')}));
  var ol = $('#ranks'); ol.textContent = '';
  rows.forEach(function(r){ ol.append(h('li', null, rankBtn(r, max, 'rk'))); });
  var present = {}; rows.forEach(function(r){ present[r.g] = 1; });
  var missing = []; for (var g = 1; g <= CONFIG.latestBatch; g++) if (!present[g]) missing.push(g);
  var w = $('#waiting'); w.textContent = '';
  if (missing.length) w.append(h('b', {text:t('wait_h', {n:missing.length})}), h('code', {text:ranges(missing)}));
  else w.append(h('b', {text:t('wait_none')}));
}
$('#bb-toggle').addEventListener('click', function(){
  var b = $('#bb-toggle'), open = b.getAttribute('aria-expanded') !== 'true';
  b.setAttribute('aria-expanded', String(open)); $('#bb-list').hidden = !open; measure();
});
$('#bb-list').addEventListener('click', function(e){ if (e.target.closest('.bb-more')){ $('#bb-toggle').setAttribute('aria-expanded', 'false'); $('#bb-list').hidden = true; measure(); } });
function renderStats(){
  var b = {}, p = {}, j = 0, i = 0, s = 0;
  DATA.forEach(function(a){ if (a.batch) b[a.batch] = 1; p[a.place] = 1; if (a.job) j++; if (a.intern) i++; if (a.share) s++; });
  $('#s-nodes').textContent = DATA.length; $('#s-batches').textContent = Object.keys(b).length; $('#s-regions').textContent = Object.keys(p).length;
  $('#s-hiring').textContent = j; $('#s-interns').textContent = i; $('#s-mentors').textContent = s;
}
function update(){
  var list = filtered(), act = anyFilter();
  $('#n-shown').textContent = list.length;
  var fb = $('#fbadge'); fb.hidden = !act; fb.textContent = list.length + '/' + DATA.length;
  $('#fclear').hidden = !act;
  var noData = loaded && !DATA.length && netState !== 'error';
  $('#empty').hidden = !(noData || (DATA.length && !list.length));
  $('#empty-t').textContent = t(noData ? 'empty_first' : 'empty');
  $('#empty-x').hidden = noData; $('#empty-pin').hidden = !noData;
  $$('#chips .chip').forEach(function(c){ c.setAttribute('aria-pressed', String(c.dataset.chip === state.chip)); });
  renderStats(); renderBattle();
  if (state.view === 'cards') renderCards(); else renderMarkers();
  measure();
}

/* ============ menu, language, share ============ */
var menuBtn = $('#menu-btn'), menuList = $('#menu-list');
function setMenu(open){ menuList.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); }
menuBtn.addEventListener('click', function(){ setMenu(menuList.hidden); });
document.addEventListener('click', function(e){ if (!menuList.hidden && !e.target.closest('.menu')) setMenu(false); });
$$('#menu-list a').forEach(function(a){ a.addEventListener('click', function(){ setMenu(false); }); });
$('#menu-pin').addEventListener('click', function(){ setMenu(false); openForm(); });

function inviteText(){ return t('inv_txt', {url:CONFIG.shareUrl || location.href.split('#')[0]}); }
function renderFooter(){
  var f = $('#ft-links'); f.textContent = '';
  if (CONFIG.branchUrl) f.append(h('a', {href:CONFIG.branchUrl, target:'_blank', rel:'noopener noreferrer', text:t('ft_site')}));
  if (CONFIG.branchEmail){ if (f.childNodes.length) f.append(' · '); f.append(t('ft_edit', {mail:CONFIG.branchEmail})); }
}
function applyLang(){
  document.documentElement.lang = lang;
  document.title = t('doc_title');
  $$('[data-i]').forEach(function(e){ e.textContent = t(e.getAttribute('data-i')); });
  $$('[data-ph]').forEach(function(e){ e.setAttribute('placeholder', t(e.getAttribute('data-ph'))); });
  $$('[data-aria]').forEach(function(e){ e.setAttribute('aria-label', t(e.getAttribute('data-aria'))); });
  $('#lang-th').setAttribute('aria-pressed', String(lang === 'th'));
  $('#lang-en').setAttribute('aria-pressed', String(lang === 'en'));
  $('#invite').value = inviteText();
  renderFooter(); renderFilterSelects(); renderFormSelects(); refreshLabelText(); updateLabels();
  clearErrors(); map.closePopup(); update();
}
$('#lang-th').addEventListener('click', function(){ lang = 'th'; applyLang(); });
$('#lang-en').addEventListener('click', function(){ lang = 'en'; applyLang(); });

var toastEl = $('#toast'), toastTimer = null;
function toast(msg){
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 4200);
}
function copyText(text){
  function fail(){ var inp = $('#invite'); inp.focus(); inp.select(); toast(t('copy_fail')); }
  try { navigator.clipboard.writeText(text).then(function(){ toast(t('copied')); }, fail); } catch (e) { fail(); }
}
$('#copy').addEventListener('click', function(){ copyText($('#invite').value); });
$('#share').addEventListener('click', function(){
  var text = inviteText();
  if (navigator.share && window.isSecureContext){
    try { navigator.share({title:t('doc_title'), text:text}).catch(function(err){ if (!err || err.name !== 'AbortError') copyText(text); }); return; } catch (e) {}
  }
  copyText(text);
});

/* ============ pin form ============ */
var dlg = $('#dlg'), form = $('#pin-form'), lastFocus = null;
var MAXG = CONFIG.latestBatch || 99;
var gIn = $('#p-batch'), nog = $('#p-nog');
function digitsOnly(){ var v = gIn.value.replace(/\D+/g, '').slice(0, 3); if (v !== gIn.value) gIn.value = v; }
gIn.addEventListener('input', digitsOnly);
nog.addEventListener('change', function(){
  gIn.disabled = nog.checked; $('#gin').classList.toggle('off', nog.checked);
  if (nog.checked){ gIn.value = ''; setErr(gIn, ''); }
});
function renderFormSelects(){
  var lv = [{v:'', t:t('fm_choose')}]; LEVELS.forEach(function(l){ lv.push({v:l.id, t:L10(l)}); });
  fillSelect($('#p-level'), lv);
  var co = [{v:'', t:t('fm_choose')}]; CAREERS.forEach(function(c){ co.push({v:c.id, t:L10(c)}); });
  fillSelect($('#p-career'), co);
  var pl = [{v:'', t:t('fm_choose')}];
  REGIONS.forEach(function(r){
    pl.push({group:L10(r), items:PROV.features.map(function(f){ return f.properties; }).filter(function(p){ return p.r === r.id; })
      .sort(function(a, b){ return lang === 'th' ? a.th.localeCompare(b.th, 'th') : a.en.localeCompare(b.en); })
      .map(function(p){ return {v:'th:' + p.c, t:lang === 'th' ? p.th : p.en}; })});
  });
  pl.push({group:t('fm_abroad'), items:ABROAD.map(function(a){ return {v:'ab:' + a.id, t:L10(a)}; })});
  fillSelect($('#p-place'), pl, $('#p-place').value || 'th:40');
}

/* field errors shown in the form itself (no browser validation bubbles) */
function setErr(el, msg){
  var box = el.closest('.f'), id = 'err-' + el.id, s = document.getElementById(id);
  if (!box) return;
  if (!msg){
    if (s) s.remove();
    el.removeAttribute('aria-invalid');
    if (!box.querySelector('.ferr')) box.classList.remove('bad');
    return;
  }
  if (!s){ s = h('small', {class:'ferr', id:id}); box.appendChild(s); }
  s.textContent = msg;
  el.setAttribute('aria-invalid', 'true');
  var d = (el.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
  if (d.indexOf(id) < 0){ d.push(id); el.setAttribute('aria-describedby', d.join(' ')); }
  box.classList.add('bad');
}
function clearErrors(){
  $$('.ferr', form).forEach(function(s){ s.remove(); });
  $$('.f.bad', form).forEach(function(b){ b.classList.remove('bad'); });
  $$('[aria-invalid]', form).forEach(function(el){ el.removeAttribute('aria-invalid'); });
  $('#topics-err').hidden = true; $('#form-err').hidden = true;
}
function val(id){ return $('#' + id).value.trim(); }
function validatePin(){
  var bad = [];
  function chk(el, ok, key, vars){ setErr(el, ok ? '' : t(key, vars)); if (!ok) bad.push(el); }
  chk($('#p-nick'), !!val('p-nick'), 'err_nick');
  if (nog.checked) setErr(gIn, '');
  else { var n = parseInt(gIn.value, 10); chk(gIn, n >= 1 && n <= MAXG, gIn.value ? 'fm_batch_err' : 'err_batch', {max:MAXG}); }
  chk($('#p-level'), !!val('p-level'), 'err_level');
  chk($('#p-career'), !!val('p-career'), 'err_career');
  chk($('#p-place'), !!val('p-place'), 'err_place');
  if ($('#c-job').checked){ chk($('#j-role'), !!val('j-role'), 'err_role'); chk($('#j-contact'), !!val('j-contact'), 'err_contact'); }
  else { setErr($('#j-role'), ''); setErr($('#j-contact'), ''); }
  if ($('#c-intern').checked) chk($('#i-contact'), !!val('i-contact'), 'err_contact'); else setErr($('#i-contact'), '');
  var te = $('#topics-err');
  if ($('#c-share').checked && !$$('input[name=topic]:checked', form).length){ te.textContent = t('fm_topics_err'); te.hidden = false; bad.push($('input[name=topic]', form)); }
  else te.hidden = true;
  chk($('#p-full'), !!val('p-full'), 'err_full');
  chk($('#p-consent'), $('#p-consent').checked, 'err_consent');
  return bad;
}
form.addEventListener('input', function(e){ var el = e.target; if (el.id && document.getElementById('err-' + el.id)) setErr(el, ''); });
form.addEventListener('change', function(e){
  var el = e.target;
  if (el.id && document.getElementById('err-' + el.id)) setErr(el, '');
  if (el.name === 'topic') $('#topics-err').hidden = true;
});
form.addEventListener('submit', function(e){ e.preventDefault(); submitPin(); });

var mini = null, miniMarker = null, cur = {lat:16.47, lon:102.82};
function updateCoordsOut(){ $('#coords').textContent = cur.lat.toFixed(2) + ', ' + cur.lon.toFixed(2); }
function setCur(lat, lon, zoom){
  cur = {lat:round2(lat), lon:round2(lon)};
  if (miniMarker) miniMarker.setLatLng([cur.lat, cur.lon]);
  if (zoom && mini) mini.setView([cur.lat, cur.lon], zoom);
  updateCoordsOut();
}
function initMini(){
  if (mini) return;
  mini = L.map('mini-el', {zoomSnap:.5, minZoom:2, maxZoom:11, attributionControl:false, maxBoundsViscosity:1});
  mini.setMaxBounds([[-75, -200], [88, 200]]);
  L.geoJSON(WORLD, {style:function(){ return {fillColor:'#1b1f25', fillOpacity:1, color:'#454d57', weight:.8}; }, interactive:false}).addTo(mini);
  L.geoJSON(PROV, {style:function(){ return {fillColor:'#21262d', fillOpacity:1, color:'#39414a', weight:.8}; }, interactive:false}).addTo(mini);
  miniMarker = L.marker([cur.lat, cur.lon], {icon:pinIcon({mine:true}), draggable:true, keyboard:true}).addTo(mini);
  miniMarker.on('dragend', function(){ var p = miniMarker.getLatLng(); setCur(p.lat, p.lng); });
  mini.on('click', function(e){ setCur(e.latlng.lat, e.latlng.lng); });
}
function placeFromSelect(){
  var v = $('#p-place').value, p = v ? placeInfo(v) : null;
  if (p) setCur(p.lat, p.lon, v.indexOf('ab:') === 0 ? 6 : 7);
}
$('#p-place').addEventListener('change', placeFromSelect);

function setInert(on){ ['.hdr', '#main', '#foot'].forEach(function(s){ var el = $(s); if (el){ if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert'); } }); }
function openForm(){
  setFilterPanel(false); setMenu(false);
  if (scanTimer) stopScan(false);
  lastFocus = document.activeElement;
  dlg.hidden = false;
  document.documentElement.classList.add('modal-open');
  setInert(true);
  initMini();
  setTimeout(function(){
    mini.invalidateSize();
    if (!$('#p-place').value) $('#p-place').value = 'th:40';
    placeFromSelect();
    try { $('#p-nick').focus({preventScroll:true}); } catch (e) { $('#p-nick').focus(); }
  }, 60);
}
function closeForm(){
  dlg.hidden = true;
  document.documentElement.classList.remove('modal-open');
  setInert(false);
  if (lastFocus && lastFocus.focus) try { lastFocus.focus({preventScroll:true}); } catch (e) {}
}
$('#open-pin').addEventListener('click', openForm);
$('#dlg-x').addEventListener('click', closeForm);
$('#dlg-cancel').addEventListener('click', closeForm);
$('#dlg-back').addEventListener('click', closeForm);
$('#dlg-submit').addEventListener('click', submitPin);
dlg.addEventListener('keydown', function(e){
  if (e.key === 'Escape'){ e.preventDefault(); closeForm(); return; }
  if (e.key !== 'Tab') return;
  var f = $$('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])', dlg).filter(function(x){ return !x.disabled && x.offsetParent !== null; });
  if (!f.length) return;
  var first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
});
document.addEventListener('keydown', function(e){
  if (e.key !== 'Escape' || !dlg.hidden) return;
  setMenu(false); setFilterPanel(false); if (scanTimer) stopScan(false);
});

$('#gps').addEventListener('click', function(){
  var msg = $('#gps-msg'); msg.textContent = '';
  if (!navigator.geolocation){ msg.textContent = t('gps_fail'); return; }
  try {
    navigator.geolocation.getCurrentPosition(function(pos){ setCur(pos.coords.latitude, pos.coords.longitude, 9); msg.textContent = t('gps_ok'); },
      function(){ msg.textContent = t('gps_fail'); }, {timeout:8000, maximumAge:60000});
  } catch (e) { msg.textContent = t('gps_fail'); }
});
function bindOpt(boxId, chkId){
  var box = $('#' + boxId), chk = $('#' + chkId), more = $('.more', box);
  function sync(){ box.classList.toggle('on', chk.checked); more.hidden = !chk.checked; }
  chk.addEventListener('change', sync); sync(); return sync;
}
var syncs = [bindOpt('o-job', 'c-job'), bindOpt('o-intern', 'c-intern'), bindOpt('o-share', 'c-share')];

var sending = false;
function setSending(on){
  sending = on;
  $('#dlg-submit').disabled = on;
  $('#submit-t').textContent = t(on ? 'fm_sending' : 'fm_submit');
  $('#submit-s').hidden = on;
}
function finishPin(rec){
  state.batch = ''; state.career = ''; state.q = ''; state.chip = 'all';
  $('#f-q').value = '';
  form.reset(); gIn.disabled = false; $('#gin').classList.remove('off');
  clearErrors(); syncs.forEach(function(s){ s(); }); $('#gps-msg').textContent = '';
  closeForm();
  renderFilterSelects(); renderFormSelects();
  update();
  toast(t(DEMO ? 'toast_added_demo' : 'toast_added'));
  showOnMap(rec);
}
function submitPin(){
  if (sending) return;
  var fe = $('#form-err');
  fe.hidden = true;
  try {
    digitsOnly();
    var bad = validatePin();
    if (bad.length){
      fe.textContent = t('err_sum', {n:bad.length}); fe.hidden = false;
      var first = bad[0];
      if (first.scrollIntoView) first.scrollIntoView({block:'center', behavior:reduced ? 'auto' : 'smooth'});
      setTimeout(function(){ try { first.focus({preventScroll:true}); } catch (e) { first.focus(); } }, reduced ? 0 : 300);
      return;
    }
    var topics = $$('input[name=topic]:checked', form).map(function(x){ return x.value; });
    var job = $('#c-job').checked, intern = $('#c-intern').checked, share = $('#c-share').checked;
    var payload = {
      nickname:val('p-nick'), batch:nog.checked ? 0 : parseInt(gIn.value, 10), level:val('p-level'), career:val('p-career'),
      place:resolvePlace(val('p-place'), cur.lat, cur.lon), lat:cur.lat, lon:cur.lon, message:val('p-msg'),
      job_role:job ? val('j-role') : '', job_contact:job ? val('j-contact') : '',
      intern_role:intern ? val('i-role') : '', intern_contact:intern ? val('i-contact') : '',
      share_topics:share ? topics : [], share_contact:share ? val('s-contact') : '',
      full_name:val('p-full'), consent:$('#p-consent').checked === true, website:$('#p-web').value
    };
    if (DEMO){
      var local = fromApi(Object.assign({}, payload, {id:'local-' + (nextId++), created_at:new Date().toISOString()}));
      local.mine = true;
      assignCode(local); DATA.push(local);
      finishPin(local);
      return;
    }
    setSending(true);
    apiCall('POST', payload).then(function(res){
      if (!res || res.ok !== true || res.ignored) throw new Error((res && res.error) || 'server_error');
      var rec = fromApi(res.pin);
      if (!rec) throw new Error('server_error');
      rec.mine = true; MINE.push(rec.id); saveMine();
      DATA.push(rec); assignCodes();
      setSending(false);
      finishPin(rec);
    }).catch(function(err){
      if (window.console) console.error(err);
      var m = String((err && err.message) || err);
      fe.textContent = (m === 'rate_limited' || m === 'busy') ? t('err_busy') : (m.indexOf('invalid:') === 0 ? t('err_invalid', {f:m.slice(8)}) : t('err_send'));
      fe.hidden = false;
      setSending(false);
    });
  } catch (err) {
    if (window.console) console.error(err);
    fe.textContent = t('err_fail') + ' (' + (err && err.message ? err.message : err) + ')';
    fe.hidden = false;
    setSending(false);
  }
}

/* ============ start ============ */
if (window.ResizeObserver){ var ro = new ResizeObserver(function(){ measure(); }); ro.observe(ovTop); ro.observe(ovBot); ro.observe(stage); }
window.addEventListener('resize', function(){ measure(); fixMinZoom(); });
var userMoved = false;
['mousedown', 'touchstart', 'wheel', 'keydown'].forEach(function(ev){ $('#map-el').addEventListener(ev, function(){ userMoved = true; }, {passive:true}); });
$$('.demo-only').forEach(function(el){ el.hidden = !DEMO; });
if (!DEMO) $('#p-full-h').setAttribute('data-i', 'fm_full_h_live');
$('#empty-pin').addEventListener('click', openForm);
$('#net-retry').addEventListener('click', loadPins);
applyLang();
measure();
updateLabels();
setView('th');
if (!DEMO) loadPins();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ measure(); if (!userMoved && state.view === 'th') fitTH(); });
})();
