import { getStore } from "@netlify/blobs";

// Initial seed data in case the blob store is empty
const defaultData = {
  "wound-care-01": {
    "title": "วิธีทำความสะอาดและดูแลแผลผ่าตัด",
    "type": "tts",
    "text": "คำแนะนำการดูแลแผลผ่าตัด: ทำความสะอาดแผลวันละ 2 ครั้งด้วยน้ำเกลือปราศจากเชื้อ ระวังอย่าให้แผลโดนน้ำโดยตรง หากมีอาการบวมแดงหรือมีหนอง ให้รีบมาพบแพทย์ทันทีครับ"
  },
  "medication-01": {
    "title": "คำแนะนำการรับประทานยาปฏิชีวนะ",
    "type": "tts",
    "text": "คำแนะนำการรับประทานยา: รับประทานยาติดต่อกันจนหมดตามที่แพทย์สั่งอย่างเคร่งครัด แม้ว่าอาการจะดีขึ้นแล้วก็ตาม เพื่อป้องกันการดื้อยา หากมีอาการแพ้ยา เช่น ผื่นคัน แน่นหน้าอก ให้หยุดยาและพบแพทย์ทันที"
  },
  "diet-recovery": {
    "title": "โภชนาการและการพักฟื้นหลังการรักษา",
    "type": "tts",
    "text": "คำแนะนำการพักฟื้น: ดื่มน้ำสะอาดอย่างน้อยวันละ 8 แก้ว รับประทานอาหารที่มีโปรตีนสูงเพื่อช่วยซ่อมแซมเนื้อเยื่อ หลีกเลี่ยงอาหารรสจัด ของหมักดอง และงดเครื่องดื่มแอลกอฮอล์ทุกชนิด"
  },
  "test-01": {
    "title": "ทดสอบระบบคำแนะนำผู้ป่วย",
    "type": "tts",
    "text": "ยินดีต้อนรับสู่ระบบคำแนะนำการดูแลตนเองสำหรับผู้ป่วย ระบบพร้อมใช้งานและสามารถอ่านออกเสียงได้อย่างถูกต้องครับ"
  }
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};

export default async (req, context) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const store = getStore("patient_instructions");

  try {
    // GET: Retrieve all records or a specific record by query param (?id=xxx)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");

      let currentData = await store.get("data", { type: "json" });
      if (!currentData) {
        // Initialize with default data if empty
        currentData = defaultData;
        await store.setJSON("data", defaultData);
      }

      if (id) {
        if (currentData[id]) {
          return new Response(JSON.stringify(currentData[id]), { headers: CORS_HEADERS });
        } else {
          return new Response(JSON.stringify({ error: "Record not found" }), {
            status: 404,
            headers: CORS_HEADERS
          });
        }
      }

      return new Response(JSON.stringify(currentData), { headers: CORS_HEADERS });
    }

    // POST: Save or update records
    if (req.method === "POST") {
      const body = await req.json();
      let currentData = await store.get("data", { type: "json" });
      if (!currentData) {
        currentData = defaultData;
      }

      // Check if body is a single record { id, title, type, text, audioBase64 } or entire db { id: {...} }
      if (body.id && body.title) {
        currentData[body.id] = {
          title: body.title,
          type: body.type || "tts",
          text: body.text || "",
          audioBase64: body.audioBase64 || ""
        };
      } else if (typeof body === "object") {
        // Bulk update / sync
        currentData = { ...currentData, ...body };
      }

      await store.setJSON("data", currentData);

      return new Response(JSON.stringify({ status: "ok", count: Object.keys(currentData).length }), {
        headers: CORS_HEADERS
      });
    }

    // DELETE: Remove record by ?id=xxx or body
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      let id = url.searchParams.get("id");
      if (!id) {
        try {
          const body = await req.json();
          id = body.id;
        } catch (e) {}
      }

      if (!id) {
        return new Response(JSON.stringify({ error: "Missing ID" }), {
          status: 400,
          headers: CORS_HEADERS
        });
      }

      let currentData = await store.get("data", { type: "json" });
      if (currentData && currentData[id]) {
        delete currentData[id];
        await store.setJSON("data", currentData);
      }

      return new Response(JSON.stringify({ status: "ok", deletedId: id }), {
        headers: CORS_HEADERS
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: CORS_HEADERS
    });
  } catch (error) {
    console.error("Netlify Blobs API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
};
