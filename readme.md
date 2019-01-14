
## Compressão de Vídeo com NodejJs para a Cloud Functions - Firebase

Faça compressão de vídeos armazenados no Cloud Storage da Firebase através de chamadas de aplicativos. É possível também implementar para ser disparado sempre que um vídeo novo for adicionado, mas talvez não seja a melhor opção por requerer muitos recursos computacional.

Requisitos Mínimos:

  - Firebase Tools
  - NodeJS 8
  - 512MB de Ram
  - 60s de timeout 

#### Primeiro Passo

Após instalar e configurar o Firebase Tools (O seu usuário do Google também), faça o clone deste projeto:  

```sh
https://github.com/jhorlima/compress_video_nodejs_firebase
```

Depois configure esse diretório a um projeto da Firebase:

```sh
cd compress_video_nodejs_firebase
firebase use <project_id>
cd functions
npm install
```

Após definir o projeto, é possível testar utilizando o Postman, por exemplo. Execute o servidor da Firebase localmente:

```sh
cd ..
firebase serve --only functions
```

Ele informará uma url para testar no Postman.

![Demostração do Postman](https://i.ibb.co/5BWLmWy/postman.png)

Para testar pelo Postman, é necessário ter o token de autenticação gerado pelos aplicativos.

[Guia da Firebase](https://firebase.google.com/docs/functions/callable-reference?hl=pt-br)

#### Formato de solicitação: cabeçalhos

A solicitação HTTP para um ponto de extremidade de acionamento chamável precisa ser um  `POST`  com os seguintes cabeçalhos:

-   Obrigatório:  `Content-Type: application/json ; charset=utf-8`
-   Obrigatório:  `Authorization: Bearer <token>`
    -   Um token de código do usuário do Firebase Authentication para o usuário conectado que fez a solicitação. O back-end  [verifica automaticamente](https://firebase.google.com/docs/auth/admin/verify-id-tokens?hl=pt-br)  esse token e o disponibiliza no  `context`  do manipulador. Se o token não for válido, a solicitação será rejeitada.

#### Corpo da solicitação

O corpo da solicitação HTTP deve ser um objeto JSON com qualquer um dos seguintes campos:

-   Obrigatório:  `data`  - o argumento passado para a função. Pode ser qualquer valor JSON válido. É automaticamente decodificado em tipos JavaScript nativos de acordo com o formato de serialização descrito abaixo.

- Dados obrigatórios, referente ao caminho original do arquivo de vídeo na Cloud Functions:
```json
{
    "data": {
        "media_bucket": "vitaltests-1c0bd.appspot.com",
        "media_path": "status/video",
        "media_file": "status1546882628321.mp4"
    }
}
```

Se houver outros campos presentes na solicitação além de data, o back-end considerará a solicitação malformada e ela será rejeitada.

- Campos opcionais
```json
{
    "data": {
        ...
        "codec": "264", // 264 ou 265 . Padrão 264, equivalente ao H.264
        "resolution": "640x?", //Resolução de saída do novo arquivo. Padrão 640x altura proporcional.
        "url_limit": 48, // Limite em horas da url de download do novo arquivo. Padrão 48 horas.
        "delete_original": true //Apagar o arquivo original após o processo ocorrer com sucesso. Padrão true.
    }
}
```

Mais informações relacionadas ao tamanho ou a forma de compressão:
[Node Fluent Ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)

####  Corpo da resposta:
  
**Especificação do protocolo para  `https.onCall`** 

Um acionador  `https.onCall`  para o Cloud Functions é um acionador HTTPS com um formato específico para a solicitação e a resposta. Veja aqui uma especificação dos formatos de solicitação e resposta HTTPS usados pelos SDKs do cliente para implementar a API. Essas informações podem ser úteis se os requisitos não puderem ser atendidos usando os SDKs do Android, do iOS ou da Web.

**Observação:**  se você  _consegue_  usar SDKs do Android, do iOS ou da Web, é recomendável usar essa opção em vez de implementar este protocolo diretamente. Os SDKs fornecem recursos para economizar tempo e trabalho de codificação, conforme detalhado nas  [Funções de chamada do seu aplicativo](https://firebase.google.com/docs/functions/callable?hl=pt-br).

**Formato de solicitação: cabeçalhos**

A solicitação HTTP para um ponto de extremidade de acionamento chamável precisa ser um  `POST`  com os seguintes cabeçalhos:

-   Obrigatório:  `Content-Type: application/json`
    -   Um  `; charset=utf-8`  opcional é permitido.
-   Opcional:  `Authorization: Bearer <token>`
    -   Um token de código do usuário do Firebase Authentication para o usuário conectado que fez a solicitação. O back-end  [verifica automaticamente](https://firebase.google.com/docs/auth/admin/verify-id-tokens?hl=pt-br)  esse token e o disponibiliza no  `context`  do manipulador. Se o token não for válido, a solicitação será rejeitada.
-   Opcional:  `Firebase-Instance-ID-Token: <iid>`
    -   O token de  [ID da instância](https://developers.google.com/instance-id/?hl=pt-br)  do SDK do cliente do Firebase. Precisa ser uma string. Está disponível no  `context`  do manipulador. É particularmente útil para enviar notificações push.

Se outros cabeçalhos forem incluídos, a solicitação será rejeitada, conforme descrito na documentação de resposta abaixo.

**Observação:**  em clientes JavaScript, essas solicitações acionam uma pré-visualização do CORS  `OPTIONS`  pelos seguintes motivos:

-   `application/json`  não é permitido. Precisa ser  `text/plain`  ou  `application/x-www-form-urlencoded`.
-   O cabeçalho de  `Authorization`  não é um  [cabeçalho de solicitação de lista segura do CORS](https://fetch.spec.whatwg.org/#cors-safelisted-request-header).
-   Outros cabeçalhos também não são permitidos.

O acionador selecionável manipula automaticamente essas solicitações  `OPTIONS`.

#### Corpo da solicitação

O corpo da solicitação HTTP deve ser um objeto JSON com qualquer um dos seguintes campos:

-   Obrigatório:  `data`  - o argumento passado para a função. Pode ser qualquer valor JSON válido. É automaticamente decodificado em tipos JavaScript nativos de acordo com o formato de serialização descrito abaixo.

Se houver outros campos presentes na solicitação, o back-end considerará a solicitação malformada e ela será rejeitada.

#### Formato de resposta: códigos de status

Há vários casos que podem resultar em códigos de status de HTTP e de string diferentes para  [erros](https://cloud.google.com/apis/design/errors?hl=pt-br)  na resposta.

1.  No caso de um erro HTTP antes de o acionador do  `client`  ser chamado, a resposta não é tratada como uma função do cliente. Por exemplo, se um cliente tentar invocar uma função inexistente, ele receberá uma resposta  `404 Not Found`.
    
2.  Se o acionador do cliente for chamado, mas a solicitação estiver no formato incorreto, como não ser JSON, com campos inválidos ou sem o campo de  `data`, a solicitação será rejeitada com  `400 Bad Request`, com um código de erro  `INVALID_ARGUMENT`.
    
3.  Se o token de autorização fornecido na solicitação for inválido, a solicitação será rejeitada com  `401 Unauthorized`, com um código de erro  `UNAUTHENTICATED`.
    
4.  Se o token do código da instância fornecido na solicitação for inválido, o comportamento é indefinido. O token do código da instância não está marcado em todas as solicitações, exceto quando é usado para enviar uma notificação por push com o FCM.
    
5.  Se o acionador chamável for invocado, mas falhar com uma exceção não manipulada ou retornar uma promessa com falha, a solicitação será rejeitada com  `500 Internal Server Error`, com um código de erro de  `INTERNAL`. Isso evita que erros de codificação sejam acidentalmente expostos a usuários finais.
    
6.  Se o acionador chamável for invocado e retornar uma condição de erro explícita usando a API fornecida para funções chamáveis, a solicitação falhará. O código de status HTTP retornado é baseado no mapeamento oficial do status de erro para o status HTTP, conforme definido no  [code.proto](https://github.com/googleapis/googleapis/blob/master/google/rpc/code.proto). O código de erro específico, a mensagem e os detalhes retornados são codificados no corpo da resposta, conforme detalhado abaixo. Isso significa que, se a função retornar um erro explícito com status  `OK`, a resposta terá status  `200 OK`, mas o campo  `error`  será definido na resposta.
    
7.  Se o acionador do cliente for bem-sucedido, o status da resposta será  `200 OK`.
    

#### Formato de resposta: cabeçalhos

A resposta tem os seguintes cabeçalhos:

-   `Content-Type: application/json`
-   Um  `; charset=utf-8`  opcional é permitido.

#### Corpo da resposta

A resposta de um ponto de extremidade do cliente é sempre um objeto JSON. No mínimo, contém  `result`  ou  `error`, juntamente com quaisquer campos opcionais. Se a resposta não for um objeto JSON, ou não contiver  `result`  ou  `error`, o SDK do cliente deverá considerar que a solicitação falhou com o código de erro do Google  `INTERNAL (13)`.

-   `error`: se este campo estiver presente, a solicitação será considerada com falha, independentemente do código de status HTTP ou se  `result`  também está presente. O valor desse campo deve ser um objeto JSON no formato padrão do  [mapeamento HTTP do Google Cloud](https://cloud.google.com/apis/design/errors?hl=pt-br#http_mapping)  para erros, com campos para  `status`,  `message`  e, opcionalmente,  `details`. O campo  `code`  não deve ser incluído. Se o campo de  `status`  não estiver definido ou for um valor inválido, o cliente deverá tratar o status como  `INTERNAL`, de acordo com o  [code.proto](https://github.com/googleapis/googleapis/blob/master/google/rpc/code.proto#L33). Se houver  `details`, ele será incluído em qualquer informação de usuário anexada ao erro no SDK do cliente, se aplicável.  

    **Observação:**  o campo  `details`  aqui é um valor fornecido pelo usuário. Não é necessariamente uma lista de valores codificados por protótipos como no formato  `Status`  do Google.
-   `data`: o valor retornado pela função. Pode ser qualquer valor JSON válido. O SDK firebase-functions codifica automaticamente o valor retornado pelo usuário para esse formato JSON. Os SDKs do cliente decodificam automaticamente esses parâmetros em tipos nativos de acordo com o formato de serialização descrito abaixo.

- Exemplo de resposta de sucesso:
![Exemplo de resposta de sucesso.](https://i.ibb.co/Fs78BkK/postman2.png)


- Resposta: 
```json
{
    "result": {
        "url": [
            "https://storage.googleapis.com/vitaltests-1c0bd.appspot.com/status%2Fvideo%2Fh.264_status1546882628321.mp4?GoogleAccessId=firebase-adminsdk-88urg%40vitaltests-1c0bd.iam.gserviceaccount.com&Expires=1547645452&Signature=QtNqFYOMJ88NW%2F72WMPX5EMpJl8alPfnxo7KWAE%2BRQSsHKCcDQulKQZTNRjjq9mqdIsni3omTkkaoK8WRpTRo91%2FE%2BhDFa2CbXb71aofvsVFuIK4BSJaQ1zu%2BIhUFvEKi%2Fk6TigORsKLPXC%2BJ3EKwapg7DwUy7iONnPrcXTKkxUOn8pnQ%2BRkiqKPb9aVfbd7uNaQ9wiEO4ZGvhNpCCQlnUI67M1WvBXpQSq4e68%2FEXN0feQcYUCrtgwUKtvJYLzbFzLGU7C9UPnCPsMLNk4OreU%2F3tgRasUhF9s%2BVTv2NeQzm30Z4ItCQa4IkDM7isJvwNKc3WRZdKGVvKDAvYOPcg%3D%3D"
        ]
    }
}
```

#### Chamando a função usando o Cliente da Firebase
https://firebase.google.com/docs/functions/callable?hl=pt-br#call_the_function