/**
 * Welcome to Cloudflare Workers!
 *
 * This is an API for the Skincare AI MVP.
 * It receives a Base64 image, sends it to OpenAI for analysis,
 * and fetches matching products from Cloudflare D1.
 */

const SYSTEM_PROMPT = `Você é um especialista em cosmetologia e dermatologia estética altamente capacitado, atuando como o motor de análise visual de um aplicativo de skincare.
Sua Missão: Analisar a imagem fornecida, identificar a parte do corpo humano exibida, avaliar o estado aparente da pele com foco puramente cosmético e recomendar categorias de princípios ativos (não marcas comerciais) que ajudem a melhorar o aspecto da pele.
Regras Estritas de Segurança e Ética:
1. Você NÃO fornece diagnósticos médicos. Nunca use palavras como doença, câncer, melanoma, infecção, etc.
2. Se identificar algo grave, recomende gentilmente a consulta com um dermatologista na mensagem ao usuário.
3. Foco puramente cosmético: hidratação, oleosidade, manchas superficiais, textura, linhas finas e acne cosmética.
4. Se a imagem for de baixíssima qualidade, muito escura, borrada, ou não for uma parte do corpo humano, você deve sinalizar o erro e pedir uma nova foto.
Formato de Saída (OBRIGATÓRIO):
Retorne EXCLUSIVAMENTE um objeto JSON válido, seguindo a estrutura:
{
  "analise_valida": true,
  "erro_imagem": null,
  "parte_do_corpo": "rosto",
  "tipo_pele_aparente": "oleosa",
  "pontos_de_atencao": ["poros dilatados", "vermelhidão leve"],
  "ativos_recomendados": ["ácido salicílico", "niacinamida"],
  "mensagem_usuario": "Notei que a pele do seu rosto apresenta...",
  "aviso_legal": "Esta é uma análise cosmética por IA e não substitui um dermatologista."
}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env, ctx) {
    // Lidar com requisições preflight (CORS)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Rota de análise
    if (request.method === 'POST' && url.pathname === '/api/analyze') {
      try {
        const body = await request.json();
        const base64Image = body.image; // Espera-se a imagem em base64 com ou sem o prefixo data:image/jpeg;base64,

        if (!base64Image) {
          return new Response(JSON.stringify({ error: 'Imagem não fornecida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 1. Chamar a API do Google Gemini (Visão)
        if (!env.GEMINI_API_KEY) {
          return new Response(JSON.stringify({ error: 'Chave da API do Gemini não configurada (GEMINI_API_KEY).' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Gemini exige o mime_type e apenas a string base64 pura (sem o prefixo data:image/...)
        let mimeType = 'image/jpeg';
        let rawBase64 = base64Image;

        if (base64Image.startsWith('data:')) {
          mimeType = base64Image.split(';')[0].split(':')[1];
          rawBase64 = base64Image.split(',')[1];
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
        
        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: `${SYSTEM_PROMPT}\n\nAnalise esta imagem estritamente segundo as regras acima e retorne apenas o JSON.` },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: rawBase64
                    }
                  }
                ]
              }
            ]
          })
        });

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error("Erro do Gemini:", errorText);
          return new Response(JSON.stringify({ error: 'Falha ao analisar a imagem com a IA', details: errorText }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const geminiData = await geminiResponse.json();
        let aiResult;
        
        try {
           const responseText = geminiData.candidates[0].content.parts[0].text;
           aiResult = JSON.parse(responseText);
        } catch (e) {
           console.error("Erro ao fazer parse do JSON do Gemini:", e);
           return new Response(JSON.stringify({ error: 'Resposta inválida da IA' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        let produtosRecomendados = [];

        // 2. Se a análise for válida, buscar produtos no D1 baseados nos ativos recomendados
        if (aiResult.analise_valida && aiResult.ativos_recomendados && aiResult.ativos_recomendados.length > 0) {
          const ativos = aiResult.ativos_recomendados;
          
          // Construir a query dinamicamente. Ex: "principio_ativo LIKE ? OR principio_ativo LIKE ?"
          const placeholders = ativos.map(() => 'principio_ativo LIKE ?').join(' OR ');
          // Colocar % antes e depois para buscar qualquer correspondência na string e deixar minúsculo
          const values = ativos.map(ativo => `%${ativo.toLowerCase()}%`);

          const query = `SELECT * FROM produtos WHERE ${placeholders} LIMIT 5`;
          
          // Executar a query no Cloudflare D1
          const { results } = await env.DB.prepare(query).bind(...values).all();
          produtosRecomendados = results;
        }

        // 3. Montar a resposta final para o frontend
        const responsePayload = {
          analise: aiResult,
          produtos: produtosRecomendados
        };

        // A memória é liberada após o retorno da requisição. A imagem base64 e os resultados locais são descartados.
        return new Response(JSON.stringify(responsePayload), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error) {
        console.error("Erro no Worker:", error);
        return new Response(JSON.stringify({ error: 'Erro interno no servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  },
};
