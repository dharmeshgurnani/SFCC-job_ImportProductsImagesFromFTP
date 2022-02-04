'use strict';

var Status = require('dw/system/Status');
var File = require('dw/io/File');

function compare(a, b) {
    if (a.idx < b.idx) { return -1; }
    if (a.idx > b.idx) { return 1; }
    return 0;
}

/**
 * This function recurse Images In Folder and parent folders to process write data to XMLIndentingStreamWriter
 * as well as move the image files to it's CATALOGS folder.
 * @param {xmlStreamWriter} xmlStreamWriter - XML writer keep writing data to file
 * @param {Array} imageSequence = provided JSON - to sort the images following convention
 * @param {string} catalogId - root folder product folders with images file, this should be catalogId
 * @param {string} productId - parent product folder
 * @param {string} folderPath - current processing folder
 * @param {Array} productImages - current images in queue
 * @param {boolean} removeFilesAfterImport - remove images files form unssigend folder folders
 */
function recurseImagesInFolder(xmlStreamWriter, imageSequence, catalogId, productId, folderPath, productImages, removeFilesAfterImport) {
    if (empty(folderPath)) {
        return;
    }

    var filesReader = new File(folderPath);
    var files = filesReader.listFiles();

    if (files.length <= 0) {
        return;
    }


    for (var index = 0; index < files.length; index++) {
        var file = files[index];
        if (file.isDirectory()) {
            productId = file.getName();
            // create image folders if not exists
            var newFolder = File.CATALOGS + File.SEPARATOR + catalogId + '/unassigned/' + productId;
            newFolder = new File(newFolder);

            if (!newFolder.exists()) {
                newFolder.mkdir();
            }
            // write product parent tag
            xmlStreamWriter.writeStartElement('product');
            xmlStreamWriter.writeAttribute('product-id', productId);
            xmlStreamWriter.writeCharacters(xmlStreamWriter.newLine);
            xmlStreamWriter.writeCharacters(xmlStreamWriter.indent);

            // write images parent tag
            xmlStreamWriter.writeStartElement('images');
            xmlStreamWriter.writeCharacters(xmlStreamWriter.newLine);
            xmlStreamWriter.writeCharacters(xmlStreamWriter.indent);

            // recurse into the files
            recurseImagesInFolder(xmlStreamWriter, imageSequence, catalogId, productId, file.getFullPath(), [], removeFilesAfterImport);

            // close the images </images>
            xmlStreamWriter.writeEndElement();

            // close the product </product>
            xmlStreamWriter.writeEndElement();

            // remove the folder after completed
            if (removeFilesAfterImport == 'true') {
                file.remove();
            }
        } else {
            try {
                // process files here
                var imgName = file.getName();
                if (imgName.toLowerCase().indexOf('.jpg') != -1 || imgName.toLowerCase().indexOf('.png') != -1) {
                    var idx = 0;
                    var names = imgName.split('_');
                    try {
                        var namecode = names[2] + '_' + names[3].split('.')[0];
                        idx = imageSequence.indexOf(namecode);
                        if (idx == -1) idx = 0;
                    } catch (e) {

                    }

                    var productItem = [];
                    productItem.idx = idx;
                    productItem.name = imgName;
                    productItem.view = names[1];
                    productItem.path = productItem.view + File.SEPARATOR + productId + File.SEPARATOR + imgName;
                    productImages.push(productItem);

                    // Move the files to new folder
                    var newFileDir = new File(File.CATALOGS + File.SEPARATOR + catalogId + '/default/images/' + productItem.view + File.SEPARATOR + productId);
                    if (!newFileDir.exists()) {
                        newFileDir.mkdir();
                    }
                    var newFileLocation = newFileDir.getFullPath() + File.SEPARATOR + imgName;
                    var newFileLoc = new File(newFileLocation);

                    // copy and remove original file form working folder
                    if (removeFilesAfterImport) {
                        if (!newFileLoc.exists()) {
                            newFileLoc.createNewFile();
                        }
                        file.renameTo(newFileLoc);
                    } else {
                        file.copyTo(newFileLoc);
                    }
                } else {
                    // remove thumb
                    file.remove();
                }
            } catch (e) {
                dw.system.Logger.getLogger('ImportProductImagesJob', 'Error').warn(e + ': ' + e.message);
            }
        }
    }

    // write to XML
    if (productImages.length > 0) {
        // get view-type configurations
        var imgViewTypes = 'large,medium,small,thumb';
        var imageViewTypes = imgViewTypes.split(',');

        // sort the files first
        productImages.sort(compare);

        // group images
        var imageGroups = [];
        for (var i = 0; i < productImages.length; i++) {
            if (imageGroups[productImages[i].view] == null && imageGroups[productImages[i].view] == undefined) {
                imageGroups[productImages[i].view] = [];
            }
            imageGroups[productImages[i].view].push(productImages[i]);
        }

        // write images into XML file
        // normal images
        for (var imageViewType = 0; imageViewType < imageViewTypes.length; imageViewType++) {
            var view = imageViewTypes[imageViewType];
            // wite image group
            xmlStreamWriter.writeStartElement('image-group');
            xmlStreamWriter.writeAttribute('view-type', view);
            xmlStreamWriter.writeCharacters(xmlStreamWriter.newLine);
            xmlStreamWriter.writeCharacters(xmlStreamWriter.indent);

            if (imageGroups[view]) {
                for (var j = 0; j < imageGroups[view].length; j++) {
                    // write images tag
                    xmlStreamWriter.writeRaw('<image path="' + imageGroups[view][j].path + '"/>');
                    xmlStreamWriter.writeCharacters(xmlStreamWriter.newLine);
                    xmlStreamWriter.writeCharacters(xmlStreamWriter.indent);
                }
            }

            // close the image group
            xmlStreamWriter.writeEndElement();
        }
    }

    return;
}
/**
 * This function generates XML file according to XMLGeneratorConfig
 * @param {string} XMLGeneratorConfig - XMLGeneratorConfig for generating xml
 * @returns {dw.system.Status}
 */
function generateCatalogXmlForImageImport(XMLGeneratorConfig) {
    var removeFilesAfterImport = XMLGeneratorConfig.removeFilesAfterImport;
    var catalogId = XMLGeneratorConfig.catalogId;

    var imageSequence = JSON.parse('["P_01", "P_02", "P_03"]');

    if (empty(catalogId)) {
        return new Status(Status.ERROR, 'ERROR', 'generateCatalogXmlForImageImport-One or more mandatory parameters are missing.');
    }

    /**
     * Working on unassigned folder first
     * Images are expected to be in this folder with directory structure
     * i.e workingFolder/unassigned/{catalogId}/{productID}/{imagefile}
     * */
    var filesReader = new File(XMLGeneratorConfig.workingFolder + '/unassigned/');

    var files = filesReader.listFiles();

    for (var index = 0; index < files.length; index++) {
        var file = files[index];
        if (file.isDirectory()) {
            var timeStamp = new Date().getTime();
            var tempFilename = file.getFullPath() + '_product_images_tmp_' + timeStamp + '.xml';
            var tempFile = new File(tempFilename);

            if (!tempFile.exists()) {
                tempFile.createNewFile();
            }
            var fileWriter = new dw.io.FileWriter(tempFile);
            var xmlStreamWriter = new dw.io.XMLIndentingStreamWriter(fileWriter);
            xmlStreamWriter.writeStartDocument('UTF-8', '1.0');

            xmlStreamWriter.writeStartElement('catalog');
            xmlStreamWriter.writeAttribute('xmlns', 'http://www.demandware.com/xml/impex/catalog/2006-10-31');
            xmlStreamWriter.writeAttribute('catalog-id', catalogId);
            xmlStreamWriter.writeCharacters(xmlStreamWriter.newLine);
            xmlStreamWriter.writeCharacters(xmlStreamWriter.indent);

            // recurse into folder
            recurseImagesInFolder(xmlStreamWriter, imageSequence, file.getName(), '', file.getFullPath(), [], removeFilesAfterImport);

            // close the catalog </catalog>
            xmlStreamWriter.writeEndElement();

            // close the document
            xmlStreamWriter.writeEndDocument();

            xmlStreamWriter.close();
            fileWriter.close();

            // final XML folder
            var targetFolderAfterGenerated = XMLGeneratorConfig.workingFolder + 'xml/';
            var targetFolderAfterGeneratedFile = new File(targetFolderAfterGenerated);
            if (!targetFolderAfterGeneratedFile.exists()) {
                targetFolderAfterGeneratedFile.mkdir();
            }

            // rename to unique file
            var finalFileName = tempFile.getName().replace('_tmp_' + timeStamp, '');
            var finalFile = new File(targetFolderAfterGenerated + finalFileName);
            tempFile.renameTo(finalFile);
            tempFile.remove();
        }
    }

    return new Status(Status.OK, null, 'Process finished.');
}

/**
 * Triggers the Job execution
 * @param {dw.util.HashMap} args
 * @returns {dw.system.Status}
 */
function execute(args) {
    var status = new Status(Status.OK);
    if (!status.error) {
        // XML Generator Configuration
        var XMLGeneratorConfig = {
            workingFolder: File.IMPEX + File.SEPARATOR + args.workingFolder,
            removeFilesAfterImport: args.removeFilesAfterImport ? args.removeFilesAfterImport : false,
            catalogId: args.catalogId ? args.catalogId : null
        };
        status = generateCatalogXmlForImageImport(XMLGeneratorConfig);
    }

    if (status.error) {
        dw.system.Logger.getLogger('ImportProductImagesJob', 'Error').warn(status.code + ': ' + status.message);
    }
    return status;
}

module.exports = { execute: execute };
