module powerbi.extensibility.visual {

    import tooltip = powerbi.extensibility.utils.tooltip;
    import DataViewObjectsParser = powerbi.extensibility.utils.dataview.DataViewObjectsParser;

    /**
     * Interface for BarCharts viewmodel.
     *
     * @interface
     * @property {BarChartDataPoint[]} dataPoints - Set of data points the visual will render.
     * @property {number} dataMax                 - Maximum data value in the set of data points.
     * @property {number} dataMin                 - Minimum data value in the set of data points.
     * @property {number} dataAdjustment           - Y axis ajustment in case of Auto Y
     * @property {BarChartSettings} settings      - Object property settings
     */
    interface BarChartViewModel {
        dataPoints: BarChartDataPoint[];
        dataMax: number;
        dataMin: number;
        dataAdjustment: number;
        settings: BarChartSettings;
    };

    /**
     * Interface for BarChart settings.
     *
     * @interface
     * @property {{show:boolean}} autoAdjustment - Object property that allows auto Y axis.
     */
    export class BarChartSettings {
        public autoAdjustment: boolean = true;
        public positiveColor: string = "red";
        public negativeColor: string = "blue";
        public totalColor: string = "green";
    }

    export class VisualSettings extends DataViewObjectsParser {
        public barCharSettings: BarChartSettings = new BarChartSettings();
    }
    
    /**
     * Interface for BarChart data points.
     *
     * @interface
     * @property {number} value        - Data value for point.
     * @property {string} category     - Coresponding category of data value.
     * @property {number} start        - Y start value for the waterfall bar
     * @property {number} end          - Y end value for the waterfall bar
     * @property {number} class        - class in order to identify total, positive or negative values
     * @property {number} selectionId  - ID of the selected item
     */
    interface BarChartDataPoint {
        value: number;
        category: string;
        start: number;
        end: number;
        class: string;
        selectionId: ISelectionId;
        color: string;
        columnLabel: string;
    };



    export class BarChart implements IVisual {
        private svg: d3.Selection<SVGElement>;
        private host: IVisualHost;
        private barChartContainer: d3.Selection<SVGElement>;
        private barContainer: d3.Selection<SVGElement>;
        private bars: d3.Selection<SVGElement>;
        private xAxis: d3.Selection<SVGElement>;
        private yAxis: d3.Selection<SVGElement>;
        private selectionManager: ISelectionManager;
        private tooltipServiceWrapper: tooltip.ITooltipServiceWrapper;
        private barChartSettings: BarChartSettings;
        private locale: string;
        private visualSettings: VisualSettings;

        static Config = {
            xScalePadding: 0.1,
            solidOpacity: 1,
            transparentOpacity: 0.4,
            margins: {
                top: 10,
                right: 0,
                bottom: 25,
                left: 45,
            },
            xAxisFontMultiplier: 0.04,
        };

        /**
         * Creates instance of BarChart. This method is only called once.
         *
         * @constructor
         * @param {VisualConstructorOptions} options - Contains references to the element that will
         *                                             contain the visual and a reference to the host
         *                                             which contains services.
         */
        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.selectionManager = options.host.createSelectionManager();
            this.tooltipServiceWrapper = tooltip.createTooltipServiceWrapper(this.host.tooltipService, options.element);
            this.locale = options.host.locale;

            let svg = this.svg = d3.select(options.element)
                .append('svg')
                .classed('barChart', true);
            this.xAxis = this.svg
                .append('g')
                .classed('xAxis', true);
            this.yAxis = this.svg
                .append('g')
                .classed('yAxis', true);
            this.barContainer = svg.append('g')
                .classed('barContainer', true);
        }

        /**
         * Function that converts queried data into a view model that will be used by the visual
         *
         * @function
         * @param {VisualUpdateOptions} options - Contains references to the size of the container
         *                                        and the dataView which contains all the data
         *                                        the visual had queried.
         * @param {IVisualHost} host            - Contains references to the host which contains services
         */
        public visualTransform(options: VisualUpdateOptions, host: IVisualHost): BarChartViewModel {
            debugger;
            let dataViews = options.dataViews;
            let defaultSettings: BarChartSettings = new BarChartSettings();
            let viewModel: BarChartViewModel = {
                dataPoints: [],
                dataMax: 0,
                dataMin: 0,
                dataAdjustment: 0,
                settings: defaultSettings
            };
            if (!dataViews
                || !dataViews[0]
                || !dataViews[0].categorical
                || !dataViews[0].categorical.categories
                || !dataViews[0].categorical.categories[0].source
                || !dataViews[0].categorical.values)
                return viewModel;

                let objects = dataViews[0].metadata.objects;

            let categorical = dataViews[0].categorical;
            let category = categorical.categories[0];
            let dataValue = categorical.values[0];
            let barChartDataPoints: BarChartDataPoint[] = [];
            let dataAdjustment: number;
            /*****************************************************************************/
            /* Populate barChartDataPoints from dataset                                  */
            /*****************************************************************************/
            let cumulative = 0;
            let dataMax = 0;
            for (let i = 0, len = Math.max(category.values.length, dataValue.values.length); i < len; i++) {
                
                if(i==len - 1)
                {
                    barChartDataPoints.push({
                        category: <string>category.values[i],
                        value: <number>dataValue.values[i],
                        start: 0,
                        end :(<number>dataValue.values[i]),
                        class:'total',
                        selectionId: host.createSelectionIdBuilder()
                            .withCategory(category, i)
                            .withMeasure(dataValue.source.displayName)
                            .createSelectionId(),
                        color:this.visualSettings.barCharSettings.totalColor,
                        columnLabel: category.source.displayName
                    });
                }
                else
                {
                    barChartDataPoints.push({
                        category: <string>category.values[i],
                        value: <number>dataValue.values[i],
                        start: cumulative,
                        end :(<number>dataValue.values[i] + cumulative),
                        class:(<number>dataValue.values[i] >= 0 ) ? 'positive' : 'negative',
                        selectionId: host.createSelectionIdBuilder()
                            .withCategory(category, i)
                            .withMeasure(dataValue.source.displayName)
                            .createSelectionId(),
                        color: (<number>dataValue.values[i] >= 0) ? this.visualSettings.barCharSettings.positiveColor : this.visualSettings.barCharSettings.negativeColor,
                        columnLabel: category.source.displayName
                    });
                }
                dataMax = Math.max(dataMax,cumulative)
                cumulative += <number>dataValue.values[i];
            }
                        
            dataAdjustment = dataMax - (2*Math.abs(dataMax - Math.min(<number>dataValue.values[dataValue.values.length-1],<number>dataValue.values[0])));
            
            return {
                dataPoints: barChartDataPoints,
                dataMax: dataMax,
                dataMin: 0,
                dataAdjustment: dataAdjustment,
                settings: this.visualSettings.barCharSettings
            };
        }

        /**
         * Updates the state of the visual. Every sequential databinding and resize will call update.
         *
         * @function
         * @param {VisualUpdateOptions} options - Contains references to the size of the container
         *                                        and the dataView which contains all the data
         *                                        the visual had queried.
         */
        public update(options: VisualUpdateOptions) {

            this.visualSettings = VisualSettings.parse<VisualSettings>(options.dataViews[0]);
            let viewModel: BarChartViewModel = this.visualTransform(options, this.host);
            let adjustment = viewModel.dataAdjustment;
            //Retrieve the visualisation size from PowerBI
            let width = options.viewport.width;
            let height = options.viewport.height;
            
            this.svg.attr({
                width: width,
                height: height
            });

            /*****************************************************************************/
            /* Configuration management                                                  */
            /*****************************************************************************/  

            if (!this.visualSettings.barCharSettings.autoAdjustment) {
                adjustment = 0; 

            }
            
            let margins = BarChart.Config.margins;
            height -= (margins.bottom + margins.top);
            width -= margins.left;


            /*****************************************************************************/
            /* Start drawing with D3.js                                                  */
            /*****************************************************************************/
            this.xAxis.style({
                "font-size": d3.min([height, width]) * BarChart.Config.xAxisFontMultiplier
            });
            this.yAxis.style({
                "font-size": d3.min([height, width]) * BarChart.Config.xAxisFontMultiplier
            });

            let yScale = d3.scale.linear()
                .domain([adjustment, viewModel.dataMax])
                .range([height, 0]);
            
            let xScale = d3.scale.ordinal()
                .domain(viewModel.dataPoints.map(d => d.category))
                .rangeRoundBands([0, width], BarChart.Config.xScalePadding);

            let xAxis = d3.svg.axis()
                .scale(xScale)
                .orient('bottom');

            this.xAxis.attr('transform', 'translate('+margins.left+', ' + (height + margins.top)  + ')')
                .call(xAxis);  

            let yAxis = d3.svg.axis()
                .scale(yScale)
                .orient('left');

            this.yAxis.attr('transform', 'translate(51, '+margins.top+')')
                .call(yAxis);               
            
                this.yAxis.attr('transform', 'translate(51, '+margins.top+')')
                .attr("class","grid")

                .call(yAxis.tickSize(-width));

            //Draw bars
            let bars = this.barContainer.selectAll('.bar').data(viewModel.dataPoints);
            bars.enter()
                .append('rect');
            bars.attr({
                width: xScale.rangeBand(),
                height: d => height - (yScale(Math.abs( d.start - d.end)+adjustment)<0?yScale(Math.abs( d.start - d.end)):yScale(Math.abs( d.start - d.end)+adjustment)),
                y: d => yScale(Math.max(d.start, d.end) ),
                x: d => xScale(d.category),
                transform: 'translate('+margins.left+', '+margins.top+')',
                class : d => 'bar ' + d.class,
                fill: d => d.color
            });

            //Draw label
            let lbl = this.barContainer.selectAll('.lbl').data(viewModel.dataPoints);
            lbl.enter()
            .append("text");
            lbl.attr({
                x: d => xScale(d.category) + xScale.rangeBand() / 2,
                y: d => yScale(d.end),
                dy: d => ((d.class=='negative') ? '-0.5em' : '1.4em'),
                transform: 'translate('+margins.left+', '+margins.top+')',
                class: 'lbl',
                'text-anchor':"middle"
            })
            .text(d => d.value);

            //Bind click event on bars to the selection manager
            let selectionManager = this.selectionManager;
            
            bars.on('click', function(d) {
                selectionManager.select(d.selectionId).then((ids: ISelectionId[]) => {
                    bars.attr({
                        'fill-opacity': ids.length > 0 ? BarChart.Config.transparentOpacity : BarChart.Config.solidOpacity
                    });
                    d3.select(this).attr({
                        'fill-opacity': BarChart.Config.solidOpacity
                    });
                });
                (<Event>d3.event).stopPropagation
            });

            //Bind tooltip to bars
            this.tooltipServiceWrapper.addTooltip(this.barContainer.selectAll('.bar, .lbl'),
                (tooltipEvent: tooltip.TooltipEventArgs<BarChartDataPoint>) => this.getTooltipData(tooltipEvent.data),
                (tooltipEvent: tooltip.TooltipEventArgs<BarChartDataPoint>) => tooltipEvent.data.selectionId
            );
            
            //Clean bars and label
            lbl.exit()
                .remove();
            bars.exit()
                .remove();

        }
        /**
         * Methods to create tooltip informations
         *
         * @function
         * @param {any} value - current selected datapoint
         */
        private getTooltipData(value: any): VisualTooltipDataItem[] {
            return [{
                displayName: value.columnLabel,
                value: value.category
            },
            {
                displayName: value.selectionId.measures[0],
                value: value.value.toString(),
                color: value.color
            }];
        }
        /**
         * Enumerates through the objects defined in the capabilities and adds the properties to the format pane
         *
         * @function
         * @param {EnumerateVisualObjectInstancesOptions} options - Map of defined objects
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            const settings: VisualSettings = this.visualSettings || VisualSettings.getDefault() as VisualSettings;

             return VisualSettings.enumerateObjectInstances(settings, options);
        }

        /**
         * Destroy runs when the visual is removed. Any cleanup that the visual needs to
         * do should be done here.
         *
         * @function
         */
        public destroy(): void {
            //Perform any cleanup tasks here
        }       
        
    }
}