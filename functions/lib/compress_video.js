/***
 * @Author Jhordan Lima <jhordan.lima@niduu.com>
 * @Company Niduu
 * @Year 2018
 *
 * **/

const os = require('os');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const ffmpeg = require('fluent-ffmpeg');

let ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

//Check if has a bin ffmpeg
if (!fs.existsSync(ffmpegPath)) {

    ffmpegPath = `./platforms/${process.platform}-${process.arch}/`;

    switch (process.platform) {
        case "win32":
            ffmpegPath = `${ffmpegPath}/ffmpeg.exe`;
            break;

        default:
            ffmpegPath = `${ffmpegPath}/ffmpeg`;
            break;
    }
}

console.info(`Ffmpeg: ${ffmpegPath}`);

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = async ({media_bucket, media_path, media_file}, {uid}) => {

    if(!media_bucket || !media_path || !media_file || !uid){
        throw Error("Sent data is invalid or authentication is missing!");
    }

    //Get bucket object
    const originalBucket = admin.storage().bucket(media_bucket);
    //Get file object from bucket
    const originalFile = originalBucket.file(`${media_path}/${media_file}`);

    if(!await originalFile.exists()){
        throw Error("No valid files were found!");
    }

    const [fileMetadata] = await originalFile.getMetadata();

    const tempPath = os.tmpdir();

    //Create a new file name
    const originalFileName = path.basename(originalFile.name);
    //Create a new temp path to original file
    const tempOriginalFilePath = path.join(tempPath, originalFileName);

    //Create a new file name
    const tempFileName = `sd_${originalFileName}`;
    //Create a new temp path to new file
    const tempNewFilePath = path.join(tempPath, path.basename(tempFileName));

    //Download original file to new temp path
    await originalFile.download({destination: tempOriginalFilePath});

    return await new Promise((resolve, reject) => {

        try {

            ffmpeg(tempOriginalFilePath)
                .videoCodec('libx265')
                .size('640x?')
                .on('end', async () => {

                    console.log('Finished processing');

                    try {

                        const [newFile] = await originalBucket.upload(tempNewFilePath, {
                            destination: `${media_path}/${tempFileName}`,
                            metadata: {
                                // Enable long-lived HTTP caching headers
                                // Use only if the contents of the file will never change
                                // (If the contents will change, use cacheControl: 'no-cache')
                                cacheControl: 'public, max-age=31536000',
                                contentType: fileMetadata.contentType,
                            },
                        });

                        //remove temp files
                        fs.unlink(tempNewFilePath);

                        const urlOptions = {
                            action: 'read',
                            expires: Date.now() + 1000 * 60 * 60 * 48, // one hour
                        };

                        originalFile.delete();

                        resolve({
                            url: await newFile.getSignedUrl(urlOptions)
                        });

                    } catch (err) {
                        reject(err);
                    } finally {
                        //remove temp files
                        fs.unlink(tempOriginalFilePath);
                    }
                })
                .on('error', err => {

                    console.log(`Cannot process video: ${err.message}`);
                    //remove temp files
                    fs.unlink(tempOriginalFilePath);
                    reject(err);

                })
                .on('progress', progress => {
                    console.log(`Processing: ${progress.percent ? progress.percent : 0} % done`);
                })
                .save(tempNewFilePath);

        } catch (err) {
            reject(err);
        }
    });

};