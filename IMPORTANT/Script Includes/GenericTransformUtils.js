var GenericTransformUtils = Class.create();
GenericTransformUtils.prototype = {
    initialize: function() {},

    /**SNDOC
    @name transformMapSummaryProcessor
    @public
    @description Creates a summary log entry to be run onComplete of a Transform Map to get aggregate statistics for the completed transform.  If there are errors, then it will generate an Incident Record
    @param {string} [tableName] String containing the table name for the Import Set Table
	@param {string} [setID] a SysID for the Import Set that has executed
	@param {string} [importNumber] a string containing the number of the Import Set to be used in messages
	@param {string} [transformName] a string containing the name of the transform map that calls this script
	@return {JSON array} returns an array of the "rowResults" compiling the results of the transform
    */
    transformMapSummaryProcessor: function(tableName, setID, importNumber, transformName) {

        // Create the rowResults
        var rowResults = {};

        // Perform an Aggregate query of the import set table by import state
        var importRowAgg = new GlideAggregate(tableName);
        importRowAgg.addAggregate('COUNT', 'sys_import_state');
        importRowAgg.addQuery('sys_import_set', setID);
        importRowAgg.query();

        while (importRowAgg.next()) {
            // For each state, populate the result row array
            var importState = importRowAgg.getValue('sys_import_state');
            var rowCount = importRowAgg.getAggregate('COUNT', 'sys_import_state');
            rowResults[importState] = rowCount;
        }

		// Log the results of the Transform
        gs.info("Transform Map '" + transformName + "' on set: " + importNumber + " completed with the following results: " + JSON.stringify(rowResults));

		// If any errors were encountered, insert an Incident using a Template called ServiceNow Transform Map Error
        if (rowResults.error != "NULL" && rowResults.error > 0) {

            var shortDescriptionMessage = "Transform Map Failure: " + transformName + " on " + importNumber;
            var descriptionMessage = "The following Transform Map has experienced some errors:";
            descriptionMessage += "\nTransform Map: " + transformName;
            descriptionMessage += "\nImport Set Number: " + importNumber;

            for (var property in rowResults) {
                descriptionMessage += "\n" + property + ": " + rowResults[property];
            }

            var incidentToInsert = new GlideRecord("incident");
            incidentToInsert.initialize();
            incidentToInsert.applyTemplate("ServiceNow Transform Map Error");
            incidentToInsert.short_description = shortDescriptionMessage;
            incidentToInsert.description = descriptionMessage;
            incidentToInsert.insert();
        }
        return rowResults;
    },
	
    type: 'GenericTransformUtils'
};