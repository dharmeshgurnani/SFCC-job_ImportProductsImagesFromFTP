# SFCC-job_ImportProductsImagesFromFTP

## Introduction
This **Salesforce Commerce Cloud** cartridge provides Job For Importing Product Images from FTP server contains cartridge with Job Step, Job metadata and Documentation.

## Implementation Documentation

### Pre Requests
**cartradge:**  [SalesforceCommerceCloud/job-components](https://github.com/SalesforceCommerceCloud/job-components) .

### setup
* Clone or Download Cartradge.
* Add Both cartridge to your code version, upload to target instance.
* Add cartridge to cartridge paths.
* Import Job from mata folder.
* Go to Job Schedules tool in BM verify FtpImportProductImages exists in jobs.
* Configure, run job.
* Done!


## Techinical Documentation

### List of job step types used
* custom.CSComponents.FtpUpload
* custom.custom.ImportProductImagesJob
* ImportCatalog

### Job Configuration
* context:  Orginization
* jobStep 1 FTPDownload job step from the [job-components](https://github.com/SalesforceCommerceCloud/job-components)
* jobStep 2 Job step from job_ftp_import_products_images to Generate XML and Move Images Files From Unassigned folder to CATALOG.
* jobStep 3 Standered import Catalog job step form standard components.

<!-- This function generates XML file according to XMLGeneratorConfig
@param {string} XMLGeneratorConfig - XMLGeneratorConfig for generating xml
@returns {dw.system.Status}
Working on unassigned folder first
Images are expected to be in this folder with directory structure
i.e workingFolder/unassigned/{catalogId}/{productID}/{imagefile}
recurse into folder
close the catalog
close the document
final XML folder
rename to unique file

sub fun recurse
 This function recurse Images In Folder and parent folders to process write data to XMLIndentingStreamWriter
 as well as move the image files to it's CATALOGS folder.
 * @param {xmlStreamWriter} xmlStreamWriter - XML writer keep writing data to file
 * @param {Array} imageSequence = provided JSON - to sort the images following convention
 * @param {string} catalogId - root folder product folders with images file, this should be catalogId
 * @param {string} productId - parent product folder
 * @param {string} folderPath - current processing folder
 * @param {Array} productImages - current images in queue
 * @param {boolean} removeFilesAfterImport - remove images files form unssigend folder folders -->
